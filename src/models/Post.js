// src/models/Post.js
const { supabase, supabaseAdmin } = require('../config/supabase');
const { generateSlug, ensureUniqueSlug } = require('../utils/slugify');

class Post {
    /**
     * Find all posts with pagination and filters
     */
    static async findAll({ 
        page = 1, 
        limit = 10, 
        category = null, 
        tag = null, 
        search = null,
        featured = null,
        orderBy = 'published_date',
        orderDir = 'desc'
    } = {}) {
        try {
            let query = supabase
                .from('posts')
                .select('*', { count: 'exact' });
            
            // Apply filters
            if (category) {
                query = query.eq('category', category);
            }
            
            if (tag) {
                query = query.contains('tags', [tag]);
            }
            
            if (search) {
                query = query.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);
            }
            
            if (featured !== null) {
                query = query.eq('featured', featured);
            }
            
            // Pagination
            const offset = (page - 1) * limit;
            query = query
                .order(orderBy, { ascending: orderDir === 'asc' })
                .range(offset, offset + limit - 1);
            
            const { data, error, count } = await query;
            
            if (error) throw error;
            
            return {
                posts: data || [],
                total: count || 0,
                page,
                limit,
                totalPages: Math.ceil((count || 0) / limit),
                hasNext: page * limit < (count || 0),
                hasPrev: page > 1
            };
        } catch (error) {
            console.error('Error in Post.findAll:', error);
            throw error;
        }
    }

    /**
 * Find one post by slug - WITH BETTER ERROR HANDLING
 */
static async findBySlug(slug) {
    try {
        console.log(`🔍 Model: Finding post by slug: ${slug}`);
        
        if (!slug) {
            console.log('❌ No slug provided');
            return null;
        }
        
        const { data, error } = await supabase
            .from('posts')
            .select('*')
            .eq('slug', slug)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                console.log(`⚠️ No post found with slug: ${slug}`);
                return null;
            }
            console.error('❌ Supabase error:', error);
            throw error;
        }
        
        console.log(`✅ Found post: ${data?.title || 'Untitled'}`);
        return data;
    } catch (error) {
        console.error('❌ Error in Post.findBySlug:', error);
        throw error;
    }
}
    /**
     * Find one post by ID
     */
    static async findById(id) {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('*')
                .eq('id', id)
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            if (error.code === 'PGRST116') {
                return null;
            }
            console.error('Error in Post.findById:', error);
            throw error;
        }
    }

    /**
     * Find featured post
     */
    static async findFeatured() {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('*')
                .eq('featured', true)
                .order('published_date', { ascending: false })
                .limit(1)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        } catch (error) {
            console.error('Error in Post.findFeatured:', error);
            return null;
        }
    }

    /**
     * Get all categories with counts
     */
    static async getCategories() {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('category')
                .not('category', 'is', null);
            
            if (error) throw error;
            
            const counts = {};
            data.forEach(row => {
                if (row.category) {
                    counts[row.category] = (counts[row.category] || 0) + 1;
                }
            });
            
            return Object.entries(counts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => a.name.localeCompare(b.name));
        } catch (error) {
            console.error('Error in Post.getCategories:', error);
            return [];
        }
    }

    /**
     * Get all unique tags
     */
    static async getTags() {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('tags');
            
            if (error) throw error;
            
            const tagSet = new Set();
            data.forEach(row => {
                if (row.tags && Array.isArray(row.tags)) {
                    row.tags.forEach(tag => {
                        if (tag && tag.trim()) {
                            tagSet.add(tag.trim());
                        }
                    });
                }
            });
            
            return Array.from(tagSet).sort();
        } catch (error) {
            console.error('Error in Post.getTags:', error);
            return [];
        }
    }

    /**
     * Increment view count
     */
    static async incrementViews(id) {
        try {
            const { error } = await supabase.rpc('increment_views', { post_id: id });
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error in Post.incrementViews:', error);
            return false;
        }
    }

    /**
     * Get related posts
     */
    static async getRelated(postId, category, limit = 3) {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('*')
                .eq('category', category)
                .neq('id', postId)
                .order('published_date', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error in Post.getRelated:', error);
            return [];
        }
    }

    /**
     * Get popular posts - FIXED: This is the missing method
     */
    static async getPopular(limit = 10) {
        try {
            // Try using the RPC function first
            const { data, error } = await supabase
                .rpc('get_popular_posts', { limit_count: limit });
            
            if (error) {
                // If RPC fails, fallback to direct query
                console.log('⚠️ RPC get_popular_posts failed, using fallback query');
                const { data: fallbackData, error: fallbackError } = await supabase
                    .from('posts')
                    .select('*')
                    .order('views', { ascending: false })
                    .order('likes', { ascending: false })
                    .limit(limit);
                
                if (fallbackError) throw fallbackError;
                return fallbackData || [];
            }
            
            return data || [];
        } catch (error) {
            console.error('Error in Post.getPopular:', error);
            // Final fallback: simple query
            try {
                const { data, error } = await supabase
                    .from('posts')
                    .select('*')
                    .order('views', { ascending: false })
                    .limit(limit);
                
                if (error) throw error;
                return data || [];
            } catch (fallbackError) {
                console.error('Fallback error in Post.getPopular:', fallbackError);
                return [];
            }
        }
    }

    /**
     * Create a new post (admin/sync)
     */
    static async create(postData) {
        try {
            if (!postData.slug && postData.title) {
                postData.slug = generateSlug(postData.title);
                postData.slug = await ensureUniqueSlug(postData.slug);
            }
            
            const { data, error } = await supabaseAdmin
                .from('posts')
                .insert(postData)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error in Post.create:', error);
            throw error;
        }
    }

    /**
     * Update a post (admin/sync)
     */
    static async update(id, postData) {
        try {
            const { data, error } = await supabaseAdmin
                .from('posts')
                .update(postData)
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error in Post.update:', error);
            throw error;
        }
    }

    /**
     * Upsert post (create or update)
     */
    static async upsert(postData) {
        try {
            if (!postData.slug && postData.title) {
                postData.slug = generateSlug(postData.title);
                postData.slug = await ensureUniqueSlug(postData.slug, postData.google_id);
            }
            
            const { data, error } = await supabaseAdmin
                .from('posts')
                .upsert(postData, { 
                    onConflict: 'slug',
                    ignoreDuplicates: false 
                })
                .select();
            
            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error in Post.upsert:', error);
            throw error;
        }
    }

    /**
     * Delete a post (admin)
     */
    static async delete(id) {
        try {
            const { error } = await supabaseAdmin
                .from('posts')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error in Post.delete:', error);
            return false;
        }
    }

    /**
     * Get post analytics
     */
    static async getAnalytics(postId) {
        try {
            const { data, error } = await supabase
                .from('post_analytics')
                .select('*')
                .eq('id', postId)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        } catch (error) {
            console.error('Error in Post.getAnalytics:', error);
            return null;
        }
    }

    /**
     * Search posts by query
     */
    static async search(query, limit = 10) {
        try {
            const { data, error } = await supabase
                .from('posts')
                .select('*')
                .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%,content::text.ilike.%${query}%`)
                .order('published_date', { ascending: false })
                .limit(limit);
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error in Post.search:', error);
            return [];
        }
    }
}

module.exports = Post;