// src/models/Comment.js
const { supabase, supabaseAdmin } = require('../config/supabase');

class Comment {
    /**
     * Get comments for a post with pagination
     */
    static async getByPost(postId, page = 1, limit = 10) {
        try {
            const offset = (page - 1) * limit;
            
            // Get top-level comments
            const { data, error, count } = await supabase
                .from('comments')
                .select('*', { count: 'exact' })
                .eq('post_id', postId)
                .is('parent_id', null)
                .eq('is_approved', true)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            
            if (error) throw error;
            
            // Get replies for each comment
            const commentsWithReplies = await Promise.all(
                (data || []).map(async (comment) => {
                    const replies = await this.getReplies(comment.id);
                    return { ...comment, replies };
                })
            );
            
            return {
                comments: commentsWithReplies,
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit)
            };
        } catch (error) {
            console.error('Error in Comment.getByPost:', error);
            return { comments: [], total: 0, page, limit, totalPages: 0 };
        }
    }

    /**
     * Get replies for a comment
     */
    static async getReplies(parentId) {
        try {
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .eq('parent_id', parentId)
                .eq('is_approved', true)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error in Comment.getReplies:', error);
            return [];
        }
    }

    /**
     * Add a comment
     */
    static async create(commentData) {
        try {
            if (!commentData.author || !commentData.content) {
                throw new Error('Author and content are required');
            }
            
            const { data, error } = await supabase
                .from('comments')
                .insert({
                    post_id: commentData.post_id,
                    author: commentData.author.trim(),
                    email: commentData.email ? commentData.email.trim() : null,
                    content: commentData.content.trim(),
                    parent_id: commentData.parent_id || null,
                    ip_address: commentData.ip_address || null,
                    user_agent: commentData.user_agent || null
                })
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error in Comment.create:', error);
            throw error;
        }
    }

    /**
     * Get comment count for a post
     */
    static async getCount(postId) {
        try {
            const { count, error } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true })
                .eq('post_id', postId)
                .eq('is_approved', true);
            
            if (error) throw error;
            return count || 0;
        } catch (error) {
            console.error('Error in Comment.getCount:', error);
            return 0;
        }
    }

    /**
     * Delete a comment (admin only)
     */
    static async delete(id) {
        try {
            await supabaseAdmin
                .from('comments')
                .delete()
                .eq('parent_id', id);
            
            const { error } = await supabaseAdmin
                .from('comments')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error in Comment.delete:', error);
            return false;
        }
    }
}

module.exports = Comment;