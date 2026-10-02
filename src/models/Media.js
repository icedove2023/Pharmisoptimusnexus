const crypto = require('crypto');
const { supabaseAdmin } = require('../config/supabase');
const {
    BUCKET,
    buildStoragePath,
    extensionFor,
    documentExtensionFor,
    MAX_FILE_BYTES,
    MAX_DOCUMENT_BYTES
} = require('../utils/media');

function normalizeMimeType(mimeType) {
    return typeof mimeType === 'string' ? mimeType.toLowerCase().trim() : '';
}

function hashBuffer(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function getAssetKind(mimeType) {
    if (!mimeType) return null;
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType === 'application/pdf') return 'document';
    return null;
}

function humanFileSize(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

class Media {
    static async list({ type = 'all', search = '', page = 1, limit = 24, sort = 'created_at', order = 'desc' } = {}) {
        const pageSize = Math.min(Math.max(parseInt(limit, 10) || 24, 1), 100);
        const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
        const offset = (pageNumber - 1) * pageSize;
        let query = supabaseAdmin.from('media').select('*', { count: 'exact' });

        if (type && type !== 'all') {
            query = query.eq('kind', type);
        }

        const term = String(search || '').trim();
        if (term) {
            const safeTerm = term.replace(/[%_]/g, '\\$&');
            query = query.or(`original_filename.ilike.%${safeTerm}%,title.ilike.%${safeTerm}%,caption.ilike.%${safeTerm}%,alt_text.ilike.%${safeTerm}%`);
        }

        const validSort = ['created_at', 'updated_at', 'size_bytes', 'original_filename'].includes(sort) ? sort : 'created_at';
        const ascending = String(order).toLowerCase() === 'asc';
        query = query.order(validSort, { ascending }).range(offset, offset + pageSize - 1);

        const { data, error, count } = await query;
        if (error) {
            console.error('Media.list failed:', error);
            throw error;
        }

        return {
            items: (data || []).map((row) => ({
                ...row,
                file_size: humanFileSize(Number(row.size_bytes || 0))
            })),
            total: count || 0,
            page: pageNumber,
            limit: pageSize,
            hasNext: pageNumber * pageSize < (count || 0),
            hasPrev: pageNumber > 1
        };
    }

    static async findById(id) {
        const { data, error } = await supabaseAdmin.from('media').select('*').eq('id', id).maybeSingle();
        if (error && error.code !== 'PGRST116') {
            console.error('Media.findById failed:', error);
            throw error;
        }
        return data || null;
    }

    static async findByHash(contentHash, mimeType) {
        if (!contentHash) return null;
        const safeMime = normalizeMimeType(mimeType);
        let query = supabaseAdmin.from('media').select('*').eq('content_hash', contentHash);
        if (safeMime) {
            query = query.eq('mime_type', safeMime);
        }
        const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
        if (error && error.code !== 'PGRST116') {
            console.error('Media.findByHash failed:', error);
            throw error;
        }
        return data || null;
    }

    static async findByStoragePath(path) {
        if (!path) return null;
        const { data, error } = await supabaseAdmin.from('media').select('*').eq('storage_path', path).maybeSingle();
        if (error && error.code !== 'PGRST116') {
            console.error('Media.findByStoragePath failed:', error);
            throw error;
        }
        return data || null;
    }

    static async updateMetadata(id, updates = {}) {
        const payload = { ...updates, updated_at: new Date().toISOString() };
        const { data, error } = await supabaseAdmin.from('media').update(payload).eq('id', id).select().single();
        if (error) {
            console.error('Media.updateMetadata failed:', error);
            throw error;
        }
        return data;
    }

    static async getUsage(publicUrl) {
        if (!publicUrl) return { count: 0, details: [] };

        async function queryTable(table, columns, condition) {
            const { data, error } = await supabaseAdmin.from(table).select(columns);
            if (error) {
                console.error(`Media usage check failed for ${table}:`, error);
                return [];
            }
            return (data || []).filter((row) => condition(row));
        }

        const usage = [];

        const posts = await queryTable('posts', 'id,title,image_url,content', (row) => {
            if (row.image_url === publicUrl) return true;
            if (!row.content || typeof row.content !== 'object') return false;
            const sections = Array.isArray(row.content.sections) ? row.content.sections : [];
            return sections.some((section) => {
                if (section && section.type === 'image' && section.src === publicUrl) return true;
                if (section && section.type === 'gallery' && Array.isArray(section.images)) {
                    return section.images.some((image) => image && image.src === publicUrl);
                }
                return false;
            });
        });
        for (const post of posts) usage.push({ table: 'posts', id: post.id, title: post.title || 'Untitled post' });

        const slides = await queryTable('hero_slides', 'id,headline,image_url', (row) => row.image_url === publicUrl);
        for (const slide of slides) usage.push({ table: 'hero_slides', id: slide.id, title: slide.headline || 'Slide' });

        const members = await queryTable('team_members', 'id,name,photo_url', (row) => row.photo_url === publicUrl);
        for (const member of members) usage.push({ table: 'team_members', id: member.id, title: member.name || 'Team member' });

        const details = await queryTable('publication_details', 'post_id, pdf_url', (row) => row.pdf_url === publicUrl);
        for (const detail of details) usage.push({ table: 'publication_details', id: detail.post_id, title: 'Publication PDF' });

        return { count: usage.length, details: usage };
    }

    static async createFromUpload({ fileBuffer, mimeType, originalFilename = 'upload', uploadedBy = null, altText = '', caption = '', title = '' }) {
        const safeMime = normalizeMimeType(mimeType);
        const kind = getAssetKind(safeMime);
        if (!kind) {
            throw new Error(`Unsupported file type: ${safeMime}`);
        }

        const extension = kind === 'image' ? extensionFor(safeMime) : documentExtensionFor(safeMime);
        if (!extension) {
            throw new Error(`Unsupported file type: ${safeMime}`);
        }

        const size = Buffer.byteLength(fileBuffer || []);
        if (size <= 0) {
            throw new Error('The uploaded file is empty.');
        }

        if (kind === 'image' && size > MAX_FILE_BYTES) {
            throw new Error('That file is too large (8 MB maximum).');
        }
        if (kind === 'document' && size > MAX_DOCUMENT_BYTES) {
            throw new Error('That PDF is too large (20 MB maximum).');
        }

        const contentHash = hashBuffer(fileBuffer);
        const existing = await Media.findByHash(contentHash, safeMime);
        if (existing) {
            return { ...existing, created: false, duplicate: true };
        }

        const storagePath = buildStoragePath(safeMime, { kind: kind === 'image' ? 'uploads' : 'documents', contentHash });

        const { error: uploadError } = await supabaseAdmin.storage.from(BUCKET).upload(storagePath, fileBuffer, {
            contentType: safeMime,
            upsert: true
        });
        if (uploadError) {
            throw uploadError;
        }

        const { data: publicData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);
        if (!publicData || !publicData.publicUrl) {
            throw new Error('Could not resolve the public URL for the uploaded media.');
        }

        const insertRow = {
            storage_bucket: BUCKET,
            storage_path: storagePath,
            public_url: publicData.publicUrl,
            original_filename: String(originalFilename || '').trim().slice(0, 255) || 'upload',
            mime_type: safeMime,
            extension,
            size_bytes: size,
            kind,
            content_hash: contentHash,
            alt_text: String(altText || '').slice(0, 300),
            caption: String(caption || '').slice(0, 1000),
            title: String(title || '').slice(0, 200),
            uploaded_by: uploadedBy || null
        };

        const { data, error } = await supabaseAdmin.from('media').insert(insertRow).select().single();
        if (error) {
            if (error.code === '23505') {
                const resolved = await Media.findByHash(contentHash, safeMime);
                if (resolved) return { ...resolved, created: false, duplicate: true };
            }
            throw error;
        }

        return { ...data, created: true, duplicate: false };
    }

    static async deleteById(id) {
        const existing = await Media.findById(id);
        if (!existing) {
            return { deleted: false, reason: 'not_found' };
        }

        const usage = await Media.getUsage(existing.public_url);
        if (usage.count > 0) {
            return { deleted: false, reason: 'in_use', usage };
        }

        const { error: storageError } = await supabaseAdmin.storage.from(BUCKET).remove([existing.storage_path]);
        if (storageError) {
            console.warn('Media delete storage cleanup warning:', storageError);
        }

        const { error } = await supabaseAdmin.from('media').delete().eq('id', id);
        if (error) {
            console.error('Media.deleteById failed:', error);
            throw error;
        }

        return { deleted: true, usage };
    }
}

module.exports = Media;
