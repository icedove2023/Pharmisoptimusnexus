// src/models/PublicationDetails.js
// The journal-style metadata for a post where kind = 'publication':
// abstract, structured author list, DOI, volume/issue/pages, dates,
// corresponding author, PDF, license and numbered references.
// One row per publication, keyed by post_id. Service-role client only.

const { supabaseAdmin } = require('../config/supabase');

class PublicationDetails {
    static async getByPostId(postId) {
        if (!postId) return null;
        const { data, error } = await supabaseAdmin
            .from('publication_details')
            .select('*')
            .eq('post_id', postId)
            .maybeSingle();
        if (error) {
            console.error('Error in PublicationDetails.getByPostId:', error);
            throw error;
        }
        return data || null;
    }

    /**
     * Batch fetch for a listing page. Returns a Map keyed by post_id so the
     * caller can look up each post's details without one query per row.
     */
    static async getByPostIds(postIds) {
        const ids = Array.from(new Set((postIds || []).filter(Boolean)));
        const map = new Map();
        if (!ids.length) return map;

        const { data, error } = await supabaseAdmin
            .from('publication_details')
            .select('*')
            .in('post_id', ids);
        if (error) {
            console.error('Error in PublicationDetails.getByPostIds:', error);
            throw error;
        }
        (data || []).forEach((row) => map.set(row.post_id, row));
        return map;
    }

    /**
     * Create or replace the details row for a publication. Always the whole
     * row: partial updates aren't needed since the editor always submits
     * every field together.
     */
    static async upsert(postId, details) {
        const { data, error } = await supabaseAdmin
            .from('publication_details')
            .upsert({ post_id: postId, ...details }, { onConflict: 'post_id' })
            .select()
            .single();
        if (error) {
            console.error('Error in PublicationDetails.upsert:', error);
            throw error;
        }
        return data;
    }
}

module.exports = PublicationDetails;
