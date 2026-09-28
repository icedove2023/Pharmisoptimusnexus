// src/models/PostAutosave.js
// One autosave slot per post, overwritten on every autosave tick. Separate
// from the real posts table so an in-progress edit is never mixed into the
// published content, and never reachable through the public read policy on
// posts (see migration 008). Service-role client only.

const { supabaseAdmin } = require('../config/supabase');

class PostAutosave {
    static async save(postId, snapshot, userId = null) {
        const { error } = await supabaseAdmin
            .from('post_autosaves')
            .upsert({ post_id: postId, snapshot, updated_by: userId, updated_at: new Date().toISOString() }, { onConflict: 'post_id' });
        if (error) {
            console.error('Error in PostAutosave.save:', error);
            throw error;
        }
    }

    static async get(postId) {
        const { data, error } = await supabaseAdmin
            .from('post_autosaves')
            .select('*')
            .eq('post_id', postId)
            .maybeSingle();
        if (error) {
            console.error('Error in PostAutosave.get:', error);
            throw error;
        }
        return data || null;
    }

    static async clear(postId) {
        const { error } = await supabaseAdmin.from('post_autosaves').delete().eq('post_id', postId);
        if (error) {
            console.error('Error in PostAutosave.clear:', error);
        }
    }
}

module.exports = PostAutosave;
