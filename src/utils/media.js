// src/utils/media.js
// Validation and path-building for images the admin uploads (post cover
// images and in-content images). The actual upload call lives in
// adminController, since it needs the Supabase storage client.

const crypto = require('crypto');

const BUCKET = 'media';
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
function buildStoragePath(mimetype, { kind = 'uploads' } = {}) {
    const ext = extensionFor(mimetype) || documentExtensionFor(mimetype);
    if (!ext) return null;
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const name = crypto.randomBytes(16).toString('hex');
    return `${kind}/${yyyy}/${mm}/${name}.${ext}`;
}

module.exports = {
    BUCKET,
    MIME_TO_EXT,
    DOCUMENT_MIME_TO_EXT,
    MAX_FILE_BYTES,
    MAX_DOCUMENT_BYTES,
    extensionFor,
    documentExtensionFor,
    buildStoragePath
};
