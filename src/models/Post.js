// src/models/Post.js
// Blog posts and publications share one table. posts.kind says which is which
// ('blog' or 'publication') and posts.status controls visibility.
//
// Public reads use the anon client and always filter to published posts (row
// level security enforces the same rule). Admin reads and writes use the
// service-role client.

const { supabase, supabaseAdmin } = require('../config/supabase');
const { generateSlug, ensureUniqueSlug } = require('../utils/slugify');

const KINDS = ['blog', 'publication'];
const STATUSES = ['draft', 'scheduled', 'published', 'archived'];
const SORTABLE = ['published_date', 'created_at', 'updated_at', 'views', 'likes', 'title'];

function assertKind(kind) {
    if (kind !== null && kind !== undefined && !KINDS.includes(kind)) {
        throw new Error(`Invalid post kind: ${kind}`);
    }
}

// Search terms go into a PostgREST filter string. Remove the characters that
// have meaning there so a visitor cannot add their own filters.
function cleanSearch(term) {
    return String(term || '')
        .replace(/[,()*%\\:"'.]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);
}

function published(select = '*', options) {
    return supabase.from('posts').select(select, options).eq('status', 'published');
}

class Post {
    /**
     * Published posts with pagination and filters.
     */
    static async findAll({
        page = 1,
        limit = 10,
        kind = null,
        category = null,
        tag = null,
        search = null,
        featured = null,
        year = null,
        orderBy = 'published_date',
        orderDir = 'desc'
    } = {}) {
        assertKind(kind);
        const sortColumn = SORTABLE.includes(orderBy) ? orderBy : 'published_date';
        const safePage = Math.max(parseInt(page, 10) || 1, 1);

        let query = published('*', { count: 'exact' });

        if (kind) query = query.eq('kind', kind);
        if (category) query = query.eq('category', category);
        if (tag) query = query.contains('tags', [tag]);
        if (featured !== null) query = query.eq('featured', featured);

        const term = cleanSearch(search);
        if (term) {
            query = query.or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`);
        }

        const yearNumber = parseInt(year, 10);
        if (yearNumber >= 1900 && yearNumber <= 2100) {
            query = query.gte('published_date', `${yearNumber}-01-01`).lte('published_date', `${yearNumber}-12-31`);
        }

        const offset = (safePage - 1) * limit;
        query = query
            .order(sortColumn, { ascending: orderDir === 'asc' })
            .range(offset, offset + limit - 1);

        const { data, error, count } = await query;
        if (error) {
            console.error('Error in Post.findAll:', error);
            throw error;
        }

        const total = count || 0;
        return {
            posts: data || [],
            total,
            page: safePage,
            limit,
            totalPages: Math.ceil(total / limit),
            hasNext: safePage * limit < total,
            hasPrev: safePage > 1
        };
    }

    /**
     * One published post by slug.
     */
    static async findBySlug(slug) {
        if (!slug) return null;

        const { data, error } = await published('*').eq('slug', slug).single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            console.error('Error in Post.findBySlug:', error);
            throw error;
        }
        return data;
    }

    /**
     * One published post by id.
     */
    static async findById(id) {
        const { data, error } = await published('*').eq('id', id).single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            console.error('Error in Post.findById:', error);
            throw error;
        }
        return data;
    }

    static async findFeatured({ kind = null } = {}) {
        assertKind(kind);
        try {
            let query = published('*').eq('featured', true);
            if (kind) query = query.eq('kind', kind);
            const { data, error } = await query
                .order('published_date', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (error) throw error;
            return data || null;
        } catch (error) {
            console.error('Error in Post.findFeatured:', error);
            return null;
        }
    }

    /**
     * Categories with the number of published posts in each.
     */
    static async getCategories({ kind = null } = {}) {
        assertKind(kind);
        try {
            let query = published('category').not('category', 'is', null);
            if (kind) query = query.eq('kind', kind);
            const { data, error } = await query;
            if (error) throw error;

            const counts = {};
            (data || []).forEach((row) => {
                counts[row.category] = (counts[row.category] || 0) + 1;
            });

            return Object.entries(counts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error('Error in Post.getCategories:', error);
            return [];
        }
    }

    static async getTags({ kind = null } = {}) {
        assertKind(kind);
        try {
            let query = published('tags');
            if (kind) query = query.eq('kind', kind);
            const { data, error } = await query;
            if (error) throw error;

            const tagSet = new Set();
            (data || []).forEach((row) => {
                if (Array.isArray(row.tags)) {
                    row.tags.forEach((tag) => {
                        if (tag && tag.trim()) tagSet.add(tag.trim());
                    });
                }
            });
            return Array.from(tagSet).sort();
        } catch (error) {
            console.error('Error in Post.getTags:', error);
            return [];
        }
    }

    /**
     * Years that have at least one published post, newest first.
     */
    static async getYears({ kind = null } = {}) {
        assertKind(kind);
        try {
            let query = published('published_date').not('published_date', 'is', null);
            if (kind) query = query.eq('kind', kind);
            const { data, error } = await query;
            if (error) throw error;

            const years = new Set();
            (data || []).forEach((row) => {
                const year = new Date(row.published_date).getFullYear();
                if (!Number.isNaN(year)) years.add(year);
            });
            return Array.from(years).sort((a, b) => b - a);
        } catch (error) {
            console.error('Error in Post.getYears:', error);
            return [];
        }
    }

    static async getRelated(postId, category, limit = 3, kind = null) {
        assertKind(kind);
        try {
            let query = published('*').neq('id', postId);
            if (category) query = query.eq('category', category);
            if (kind) query = query.eq('kind', kind);
            const { data, error } = await query
                .order('published_date', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error in Post.getRelated:', error);
            return [];
        }
    }

    static async getPopular(limit = 10, { kind = null } = {}) {
        assertKind(kind);
        try {
            let query = published('*');
            if (kind) query = query.eq('kind', kind);
            const { data, error } = await query
                .order('views', { ascending: false })
                .order('likes', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error in Post.getPopular:', error);
            return [];
        }
    }

    /**
     * Published counts per kind, for the home page.
     */
    static async getCounts() {
        const count = async (kind) => {
            const { count: total, error } = await published('id', { count: 'exact', head: true }).eq('kind', kind);
            if (error) {
                console.error('Error in Post.getCounts:', error);
                return 0;
            }
            return total || 0;
        };
        const [blog, publication] = await Promise.all([count('blog'), count('publication')]);
        return { blog, publication };
    }

    // ------------------------------------------------------------
    // Admin (service role: sees every status)
    // ------------------------------------------------------------

    static async adminList({ kind = null, status = null, search = null, page = 1, limit = 20 } = {}) {
        assertKind(kind);
        if (status && !STATUSES.includes(status)) {
            throw new Error(`Invalid post status: ${status}`);
        }
        const safePage = Math.max(parseInt(page, 10) || 1, 1);

        let query = supabaseAdmin
            .from('posts')
            .select('id, title, slug, kind, status, category, published_date, updated_at, views, likes', { count: 'exact' });

        if (kind) query = query.eq('kind', kind);
        if (status) query = query.eq('status', status);

        const term = cleanSearch(search);
        if (term) query = query.ilike('title', `%${term}%`);

        const offset = (safePage - 1) * limit;
        const { data, error, count } = await query
            .order('updated_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) throw error;

        const total = count || 0;
        return {
            posts: data || [],
            total,
            page: safePage,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1)
        };
    }

    static async adminFindById(id) {
        const { data, error } = await supabaseAdmin.from('posts').select('*').eq('id', id).maybeSingle();
        if (error) {
            console.error('Error in Post.adminFindById:', error);
            throw error;
        }
        return data || null;
    }

    static async setStatus(id, status, userId = null) {
        if (!STATUSES.includes(status)) {
            throw new Error(`Invalid post status: ${status}`);
        }
        const { data, error } = await supabaseAdmin
            .from('posts')
            .update({ status, updated_by: userId })
            .eq('id', id)
            .select('id, status')
            .maybeSingle();
        if (error) throw error;
        return data || null;
    }

    static async create(postData) {
        const values = { ...postData };
        if (!values.slug && values.title) {
            values.slug = await ensureUniqueSlug(generateSlug(values.title));
        }
        const { data, error } = await supabaseAdmin.from('posts').insert(values).select().single();
        if (error) {
            console.error('Error in Post.create:', error);
            throw error;
        }
        return data;
    }

    static async update(id, postData) {
        const { data, error } = await supabaseAdmin
            .from('posts')
            .update(postData)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            console.error('Error in Post.update:', error);
            throw error;
        }
        return data;
    }

    static async delete(id) {
        const { error } = await supabaseAdmin.from('posts').delete().eq('id', id);
        if (error) {
            console.error('Error in Post.delete:', error);
            return false;
        }
        return true;
    }
}

Post.KINDS = KINDS;
Post.STATUSES = STATUSES;

module.exports = Post;
