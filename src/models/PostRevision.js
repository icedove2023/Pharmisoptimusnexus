// src/models/PostRevision.js
// Append-only revision history, one row per save. Service-role client only
// (no public policy exists on this table - see migration 008).

const { supabaseAdmin } = require('../config/supabase');

const KEEP = 20;

class PostRevision {
    /**
     * Record a snapshot after a successful save, then trim old revisions
     * beyond the most recent KEEP. Errors are logged but never thrown: a
     * revision-history failure must not fail the save the admin was doing.
     */
    static async record(postId, snapshot, userId = null) {
        try {
            const { error } = await supabaseAdmin
                .from('post_revisions')
                .insert({ post_id: postId, snapshot, created_by: userId });
            if (error) throw error;

            const { error: pruneError } = await supabaseAdmin.rpc('prune_post_revisions', {
                p_post_id: postId,
                p_keep: KEEP
            });
            if (pruneError) throw pruneError;
        } catch (error) {
            console.error('Error in PostRevision.record:', error);
        }
    }

    static async list(postId) {
        const { data, error } = await supabaseAdmin
            .from('post_revisions')
            .select('id, created_by, created_at')
            .eq('post_id', postId)
            .order('created_at', { ascending: false });
        if (error) {
            console.error('Error in PostRevision.list:', error);
            throw error;
        }
        return data || [];
    }

    static async get(postId, revisionId) {
        const { data, error } = await supabaseAdmin
            .from('post_revisions')
            .select('*')
            .eq('post_id', postId)
            .eq('id', revisionId)
            .maybeSingle();
        if (error) {
            console.error('Error in PostRevision.get:', error);
            throw error;
        }
        return data || null;
    }
}

module.exports = PostRevision;
