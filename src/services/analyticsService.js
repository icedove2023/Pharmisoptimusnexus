// src/services/analyticsService.js
const { Post, Comment, Like, View } = require('../models');
const cacheService = require('./cacheService');

class AnalyticsService {
    constructor() {
        this.trackingEnabled = process.env.NODE_ENV !== 'test';
    }

    /**
     * Track an event
     */
    async trackEvent(eventType, data) {
        if (!this.trackingEnabled) return;
        
        try {
            // Log event for debugging
            console.log(`📊 Event: ${eventType}`, data);
            
            // Here you could send to external analytics services
            // e.g., Google Analytics, Mixpanel, etc.
            
            // Store in database if needed
            // await AnalyticsEvent.create({ eventType, data, timestamp: new Date() });
        } catch (error) {
            console.error('Error tracking event:', error);
        }
    }

    /**
     * Get overall analytics
     */
    async getOverallAnalytics(days = 30) {
        try {
            const cacheKey = `analytics:overall:${days}`;
            const cached = cacheService.get(cacheKey);
            if (cached) return cached;
            
            const allPosts = await Post.findAll({ limit: 1000 });
            const totalPosts = allPosts.total || 0;
            
            // Get counts
            const totalComments = await Comment.getCount();
            const totalLikes = await Like.getCount();
            const totalViews = await View.getCount();
            
            // Get recent stats
            const recentViews = await View.getDailyStats(days);
            
            // Get top posts
            const topPosts = await Post.getPopular(10);
            
            // Get category distribution
            const categories = await Post.getCategories();
            
            const result = {
                totalPosts,
                totalComments,
                totalLikes,
                totalViews,
                recentViews,
                topPosts,
                categories,
                period: `${days} days`
            };
            
            cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
            return result;
        } catch (error) {
            console.error('Error getting overall analytics:', error);
            return null;
        }
    }

    /**
     * Get post analytics
     */
    async getPostAnalytics(postId) {
        try {
            const post = await Post.findById(postId);
            if (!post) return null;
            
            const views = await View.getCount(postId);
            const uniqueViews = await View.getUniqueCount(postId);
            const likes = post.likes || 0;
            const comments = await Comment.getCount(postId);
            
            // Engagement rate: (likes + comments) / views * 100
            const engagementRate = views > 0 
                ? ((likes + comments) / views * 100).toFixed(2)
                : 0;
            
            return {
                postId: post.id,
                title: post.title,
                views,
                uniqueViews,
                likes,
                comments,
                engagementRate: parseFloat(engagementRate),
                publishedDate: post.published_date
            };
        } catch (error) {
            console.error('Error getting post analytics:', error);
            return null;
        }
    }

    /**
     * Get trending posts
     */
    async getTrendingPosts(limit = 5, days = 7) {
        try {
            const cacheKey = `analytics:trending:${limit}:${days}`;
            const cached = cacheService.get(cacheKey);
            if (cached) return cached;
            
            // Get popular posts with recent activity
            const posts = await Post.getPopular(limit * 2);
            
            // Filter by recent activity (if available)
            // This is a simplified version - you could track views per day
            const trending = posts.slice(0, limit);
            
            cacheService.set(cacheKey, trending, 1800); // Cache for 30 minutes
            return trending;
        } catch (error) {
            console.error('Error getting trending posts:', error);
            return [];
        }
    }

    /**
     * Get daily active users (simplified)
     */
    async getDailyActiveUsers() {
        try {
            const cacheKey = 'analytics:dau';
            const cached = cacheService.get(cacheKey);
            if (cached) return cached;
            
            // Get unique IPs from views in the last 24 hours
            const views = await View.getByDateRange(
                new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                new Date().toISOString()
            );
            
            const uniqueIps = new Set(views.map(v => v.ip_address).filter(ip => ip));
            
            const result = uniqueIps.size;
            cacheService.set(cacheKey, result, 3600); // Cache for 1 hour
            return result;
        } catch (error) {
            console.error('Error getting daily active users:', error);
            return 0;
        }
    }

    /**
     * Get post timeline (views over time)
     */
    async getPostTimeline(postId, days = 30) {
        try {
            const views = await View.getByDateRange(
                new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
                new Date().toISOString()
            );
            
            // Filter views for this post
            const postViews = views.filter(v => v.post_id === postId);
            
            // Group by date
            const timeline = {};
            postViews.forEach(view => {
                const date = view.created_at.split('T')[0];
                timeline[date] = (timeline[date] || 0) + 1;
            });
            
            return Object.entries(timeline)
                .map(([date, count]) => ({ date, count }))
                .sort((a, b) => a.date.localeCompare(b.date));
        } catch (error) {
            console.error('Error getting post timeline:', error);
            return [];
        }
    }

    /**
     * Get top referrers
     */
    async getTopReferrers(limit = 10) {
        try {
            const views = await View.getByDateRange(
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                new Date().toISOString()
            );
            
            const referrers = {};
            views.forEach(view => {
                if (view.referer) {
                    try {
                        const url = new URL(view.referer);
                        const domain = url.hostname;
                        referrers[domain] = (referrers[domain] || 0) + 1;
                    } catch (e) {
                        // Invalid URL
                    }
                }
            });
            
            return Object.entries(referrers)
                .map(([domain, count]) => ({ domain, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, limit);
        } catch (error) {
            console.error('Error getting top referrers:', error);
            return [];
        }
    }

    /**
     * Track search query
     */
    trackSearch(query, results) {
        this.trackEvent('search', {
            query,
            results: results || 0,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Track user interaction
     */
    trackInteraction(type, data) {
        this.trackEvent('interaction', {
            type,
            ...data,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = new AnalyticsService();