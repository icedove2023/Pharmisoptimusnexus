// src/utils/media.js
// Validation and path-building for images the admin uploads (post cover
// images and in-content images). The actual upload call lives in
// adminController, since it needs the Supabase storage client.

const crypto = require('crypto');

const BUCKET = 'media';
const DEFAULT_IMAGE_SOURCES = ["'self'", 'data:', 'https://images.unsplash.com'];
const MIME_TO_EXT = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif'
};
const DOCUMENT_MIME_TO_EXT = {
    'application/pdf': 'pdf'
};
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;

function extensionFor(mimetype) {
    return MIME_TO_EXT[mimetype] || null;
}

function documentExtensionFor(mimetype) {
    return DOCUMENT_MIME_TO_EXT[mimetype] || null;
}

/**
 * A random, unguessable storage path, namespaced by kind and month so a
 * bucket listing stays browsable. Never derived from the original filename:
 * that avoids path traversal, collisions and leaking the uploader's local
 * file names.
 */
function buildStoragePath(mimetype, { kind = 'uploads', contentHash } = {}) {
    const ext = extensionFor(mimetype) || documentExtensionFor(mimetype);
    if (!ext) return null;
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const name = String(contentHash || crypto.randomBytes(16).toString('hex')).replace(/[^a-f0-9]/gi, '').slice(0, 32) || crypto.randomBytes(16).toString('hex');
    return `${kind}/${yyyy}/${mm}/${name}.${ext}`;
}

function isImageMimeType(mimetype) {
    return typeof mimetype === 'string' && mimetype.toLowerCase().startsWith('image/');
}

function isDocumentMimeType(mimetype) {
    return typeof mimetype === 'string' && mimetype.toLowerCase() === 'application/pdf';
}

function getMimeKind(mimetype) {
    if (isImageMimeType(mimetype)) return 'image';
    if (isDocumentMimeType(mimetype)) return 'document';
    return null;
}

function hashFileBuffer(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function getSupabaseStorageOrigin(rawUrl) {
    if (typeof rawUrl !== 'string') return null;
    const value = rawUrl.trim();
    if (!value) return null;

    try {
        const parsed = new URL(value);
        return parsed.origin && /^https?:$/.test(parsed.protocol) ? parsed.origin : null;
    } catch (error) {
        console.warn('Ignoring invalid SUPABASE_URL for CSP image sources:', error.message);
        return null;
    }
}

function getAllowedImageSources(rawSupabaseUrl) {
    const sources = [...DEFAULT_IMAGE_SOURCES];
    const supabaseOrigin = getSupabaseStorageOrigin(rawSupabaseUrl);
    if (supabaseOrigin && !sources.includes(supabaseOrigin)) {
        sources.push(supabaseOrigin);
    }
    return sources;
}

module.exports = {
    BUCKET,
    DEFAULT_IMAGE_SOURCES,
    MIME_TO_EXT,
    DOCUMENT_MIME_TO_EXT,
    MAX_FILE_BYTES,
    MAX_DOCUMENT_BYTES,
    extensionFor,
    documentExtensionFor,
    buildStoragePath,
    isImageMimeType,
    isDocumentMimeType,
    getMimeKind,
    hashFileBuffer,
    getSupabaseStorageOrigin,
    getAllowedImageSources
};
