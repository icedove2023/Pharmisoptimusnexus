// src/utils/slugify.js
const { supabaseAdmin } = require('../config/supabase');

/**
 * Generate a URL slug from a title
 */
function generateSlug(title) {
    if (!title) return '';
    
    return title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
        .replace(/\s+/g, '-')          // Replace spaces with hyphens
        .replace(/-+/g, '-')           // Remove multiple hyphens
        .trim();
}

/**
 * Ensure a slug is unique
 */
async function ensureUniqueSlug(baseSlug, excludeId = null) {
    let uniqueSlug = baseSlug;
    let counter = 1;
    let exists = true;
    
    while (exists) {
        let query = supabaseAdmin
            .from('posts')
            .select('id')
            .eq('slug', uniqueSlug);
        
        if (excludeId) {
            query = query.neq('google_id', excludeId);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('Error checking slug uniqueness:', error);
            break;
        }
        
        if (data && data.length > 0) {
            uniqueSlug = `${baseSlug}-${counter}`;
            counter++;
        } else {
            exists = false;
        }
    }
    
    return uniqueSlug;
}

/**
 * Generate a random ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

module.exports = {
    generateSlug,
    ensureUniqueSlug,
    generateId
};