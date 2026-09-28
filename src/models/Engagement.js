// src/models/Engagement.js
// Views and likes. All writes go through security-definer database functions
// (see migration 005) so a visitor can only ever be counted once per post per
// day, and can only hold one like per post. Uses the service-role client.

const { supabaseAdmin } = require('../config/supabase');

function firstRow(data) {
    return Array.isArray(data) ? data[0] : data;
}

class Engagement {
    /**
     * Count a view. Returns { counted, views }. counted is false when this
     * visitor already has a view for this post today.
     */
    static async recordView(postId, visitorHash, referer = null) {
        const { data, error } = await supabaseAdmin.rpc('record_post_view', {
            p_post_id: postId,
            p_visitor: visitorHash,
            p_referer: referer
        });
        if (error) throw error;

        const row = firstRow(data) || {};
        return { counted: Boolean(row.counted), views: Number(row.views) || 0 };
    }

    /**
     * Like or unlike. Returns { liked, likes }.
     */
    static async toggleLike(postId, visitorHash) {
        const { data, error } = await supabaseAdmin.rpc('toggle_post_like', {
            p_post_id: postId,
            p_visitor: visitorHash
        });
        if (error) throw error;

        const row = firstRow(data) || {};
        return { liked: Boolean(row.liked), likes: Number(row.likes) || 0 };
    }

    static async hasLiked(postId, visitorHash) {
        if (!postId || !visitorHash) return false;
        try {
            const { data, error } = await supabaseAdmin
                .from('post_likes')
                .select('post_id')
                .eq('post_id', postId)
                .eq('visitor_hash', visitorHash)
                .limit(1);
            if (error) throw error;
            return Array.isArray(data) && data.length > 0;
        } catch (error) {
            console.error('Error in Engagement.hasLiked:', error);
            return false;
        }
    }

    /**
     * Views per day for the last N days: [{ date: 'YYYY-MM-DD', views }].
     */
    static async getDailyViews(days = 30) {
        const span = Math.min(Math.max(parseInt(days, 10) || 30, 1), 365);
        const since = new Date(Date.now() - (span - 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

        const { data, error } = await supabaseAdmin
            .from('post_views')
            .select('viewed_on')
            .gte('viewed_on', since)
            .limit(50000);
        if (error) throw error;

        const perDay = {};
        (data || []).forEach((row) => {
            perDay[row.viewed_on] = (perDay[row.viewed_on] || 0) + 1;
        });

        return Object.keys(perDay)
            .sort()
            .map((date) => ({ date, views: perDay[date] }));
    }
}

module.exports = Engagement;
