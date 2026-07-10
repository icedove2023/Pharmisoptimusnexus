// src/models/Like.js
const { supabase, supabaseAdmin } = require('../config/supabase');

class Like {
    /**
     * Toggle like on a post
     */
    static async toggle(postId, sessionId, ipAddress) {
        try {
            const { data, error } = await supabase.rpc('toggle_like', {
                post_id: postId,
                session_id: sessionId,
                ip_address: ipAddress
            });
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error in Like.toggle:', error);
            throw error;
        }
    }

    /**
     * Check if user has liked a post
     */
    static async hasLiked(postId, sessionId) {
        try {
            const { data, error } = await supabase
                .from('likes')
                .select('id')
                .eq('post_id', postId)
                .eq('session_id', sessionId)
                .maybeSingle();
            
            if (error) throw error;
            return !!data;
        } catch (error) {
            console.error('Error in Like.hasLiked:', error);
            return false;
        }
    }

    /**
     * Get like count for a post
     */
    static async getCount(postId) {
        try {
            const { count, error } = await supabase
                .from('likes')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', postId);
            
            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error in Like.getCount:', error);
            return 0;
        }
    }
}

module.exports = Like;