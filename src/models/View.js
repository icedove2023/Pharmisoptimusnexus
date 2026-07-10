// src/models/View.js
const { supabase, supabaseAdmin } = require('../config/supabase');

class View {
    /**
     * Track a view
     */
    static async track(postId, sessionId, ipAddress, userAgent, referer) {
        try {
            // Check if already viewed in this session (last 24 hours)
            const { data: existing, error: checkError } = await supabase
                .from('views')
                .select('id')
                .eq('post_id', postId)
                .eq('session_id', sessionId)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .maybeSingle();
            
            if (checkError) {
                console.log('⚠️ Check view error:', checkError.message);
            }
            
            if (existing) {
                console.log('👁️ View already tracked for this session');
                return false;
            }
            
            // Try to insert view
            const { data, error } = await supabase
                .from('views')
                .insert({
                    post_id: postId,
                    session_id: sessionId,
                    ip_address: ipAddress || null,
                    user_agent: userAgent || null,
                    referer: referer || null
                })
                .select()
                .single();
            
            if (error) {
                // If RLS error, try using admin client
                if (error.code === '42501') {
                    console.log('⚠️ RLS policy blocking view, trying admin client...');
                    
                    const { error: adminError } = await supabaseAdmin
                        .from('views')
                        .insert({
                            post_id: postId,
                            session_id: sessionId,
                            ip_address: ipAddress || null,
                            user_agent: userAgent || null,
                            referer: referer || null
                        });
                    
                    if (adminError) {
                        console.error('❌ Admin insert failed:', adminError);
                        return false;
                    }
                    
                    // Increment view count using RPC
                    await supabase.rpc('increment_views', { post_id: postId });
                    console.log('👁️ View tracked via admin client');
                    return true;
                }
                
                console.error('❌ View insert error:', error);
                return false;
            }
            
            // Increment post view count
            await supabase.rpc('increment_views', { post_id: postId });
            console.log('👁️ View tracked successfully');
            return true;
        } catch (error) {
            console.error('❌ Error in View.track:', error);
            return false;
        }
    }

    /**
     * Get view count for a post
     */
    static async getCount(postId) {
        try {
            const { count, error } = await supabase
                .from('views')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', postId);
            
            if (error) {
                console.error('❌ Error getting view count:', error);
                return 0;
            }
            return count || 0;
        } catch (error) {
            console.error('❌ Error in View.getCount:', error);
            return 0;
        }
    }
}

module.exports = View;