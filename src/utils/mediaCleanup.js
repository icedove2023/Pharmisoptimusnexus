// Conservative media lifecycle helpers.
//
// This project stores persistent uploads in the Supabase Storage `media` bucket.
// Vercel's filesystem is intentionally not treated as a long-lived media store,
// and deletion is intentionally conservative: never delete an object unless the
// exact URL/path can be proven unused across the relevant database fields.
//
// The helpers here are intentionally limited to parsing and validation so they can
// be reused safely by cleanup logic later without introducing schema changes.

function isSupabaseMediaUrl(value) {
    if (typeof value !== 'string') return false;
    const url = value.trim();
    if (!url) return false;

    try {
        const parsed = new URL(url);
        const isSupabaseHost = parsed.hostname.endsWith('.supabase.co') || parsed.hostname === 'supabase.co';
        const isMediaStoragePath = /\/storage\/v1\/object\/public\/media\//i.test(parsed.pathname);
        return parsed.protocol === 'https:' && isSupabaseHost && isMediaStoragePath;
    } catch (error) {
        return false;
    }
}

function extractStoragePathFromSupabaseUrl(value) {
    if (!isSupabaseMediaUrl(value)) return null;

    try {
        const parsed = new URL(value);
        const prefix = '/storage/v1/object/public/media/';
        const path = parsed.pathname.slice(prefix.length);
        if (!path || path.includes('..') || path.startsWith('/')) return null;
        return decodeURIComponent(path);
    } catch (error) {
        return null;
    }
}

module.exports = {
    isSupabaseMediaUrl,
    extractStoragePathFromSupabaseUrl
};
