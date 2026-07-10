// src/controllers/apiController.js
const { Post, Comment, Like, View } = require('../models');
const { validateEmail, validateComment, validateAuthor, sanitizeString } = require('../utils/validation');
const config = require('../config');
const axios = require('axios');
const googleSheetsService = require('../services/googleSheetsService');

/**
 * Track a view
 */
exports.trackView = async (req, res) => {
    try {
        const { postId } = req.params;
        const sessionId = req.session.id;
        const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        const userAgent = req.headers['user-agent'];
        const referer = req.headers['referer'] || req.headers['referrer'];
        
        // Check if post exists
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Track the view
        const tracked = await View.track(postId, sessionId, ip, userAgent, referer);
        
        // Get updated view count
        const updatedPost = await Post.findById(postId);
        const views = updatedPost?.views || 0;
        
        res.json({ 
            success: true, 
            tracked,
            views,
            message: tracked ? 'View tracked' : 'Already viewed'
        });
    } catch (error) {
        console.error('Error tracking view:', error);
        res.json({ 
            success: true, 
            tracked: false, 
            views: 0,
            message: 'View tracking unavailable'
        });
    }
};


/**
 * Get view count
 */
exports.getViewCount = async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await Post.findById(postId);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        res.json({ 
            success: true, 
            views: post.views || 0
        });
    } catch (error) {
        console.error('Error getting view count:', error);
        res.status(500).json({ error: 'Failed to get view count' });
    }
};

/**
 * Toggle like on a post
 */
exports.toggleLike = async (req, res) => {
    try {
        const { postId } = req.params;
        const sessionId = req.session.id;
        const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        
        // Check if post exists
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Toggle like
        const result = await Like.toggle(postId, sessionId, ip);
        
        res.json({ 
            success: true, 
            liked: result.liked,
            likes: result.count
        });
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ error: 'Failed to toggle like' });
    }
};

/**
 * Get like count
 */
exports.getLikeCount = async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await Post.findById(postId);
        
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        res.json({ 
            success: true, 
            likes: post.likes || 0
        });
    } catch (error) {
        console.error('Error getting like count:', error);
        res.status(500).json({ error: 'Failed to get like count' });
    }
};
/**
 * Get comments for a post
 */
exports.getComments = async (req, res) => {
    try {
        const { postId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        
        // Check if post exists
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Get comments
        const result = await Comment.getByPost(postId, page, limit);
        
        res.json({ 
            success: true, 
            ...result
        });
    } catch (error) {
        console.error('Error getting comments:', error);
        res.status(500).json({ error: 'Failed to get comments' });
    }
};

/**
 * Add a comment
 */
exports.addComment = async (req, res) => {
    try {
        const { postId } = req.params;
        const { author, email, content, parentId } = req.body;
        
        // Validate inputs
        if (!validateAuthor(author)) {
            return res.status(400).json({ 
                error: 'Name must be at least 2 characters long' 
            });
        }
        
        if (!validateComment(content)) {
            return res.status(400).json({ 
                error: 'Comment must be between 2 and 5000 characters' 
            });
        }
        
        if (email && !validateEmail(email)) {
            return res.status(400).json({ 
                error: 'Invalid email address' 
            });
        }
        
        // Check if post exists
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }
        
        // Sanitize inputs
        const sanitizedAuthor = sanitizeString(author);
        const sanitizedContent = sanitizeString(content);
        const sanitizedEmail = email ? sanitizeString(email) : null;
        
        // Create comment
        const comment = await Comment.create({
            post_id: postId,
            author: sanitizedAuthor,
            email: sanitizedEmail,
            content: sanitizedContent,
            parent_id: parentId || null,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.headers['user-agent']
        });
        
        res.status(201).json({ 
            success: true, 
            comment,
            message: 'Comment added successfully'
        });
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ error: 'Failed to add comment' });
    }
};

/**
 * Delete a comment (admin only)
 */
exports.deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        
        // TODO: Add admin authentication check
        
        const deleted = await Comment.delete(commentId);
        
        if (!deleted) {
            return res.status(404).json({ error: 'Comment not found' });
        }
        
        res.json({ 
            success: true, 
            message: 'Comment deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting comment:', error);
        res.status(500).json({ error: 'Failed to delete comment' });
    }
};

/**
 * Get popular posts
 */
exports.getPopularPosts = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const popular = await Post.getPopular(limit);
        
        res.json({ 
            success: true, 
            posts: popular
        });
    } catch (error) {
        console.error('Error getting popular posts:', error);
        res.status(500).json({ error: 'Failed to get popular posts' });
    }
};

/**
 * Get view analytics (admin only)
 */
exports.getViewAnalytics = async (req, res) => {
    try {
        // TODO: Add admin authentication check
        
        const days = parseInt(req.query.days) || 30;
        const stats = await View.getDailyStats(days);
        
        // Get top posts
        const topPosts = await Post.getPopular(10);
        
        res.json({ 
            success: true, 
            stats,
            topPosts
        });
    } catch (error) {
        console.error('Error getting view analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
};

/**
 * Contact form submission
 */
exports.submitContact = async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        // Validate
        if (!name || name.length < 2) {
            return res.status(400).json({ error: 'Name is required (minimum 2 characters)' });
        }
        
        if (!email || !validateEmail(email)) {
            return res.status(400).json({ error: 'Valid email is required' });
        }
        
        if (!message || message.length < 10) {
            return res.status(400).json({ error: 'Message is required (minimum 10 characters)' });
        }
        
        // Send email notification
        // You can implement email sending here using nodemailer or similar
        
        // Log the submission
        console.log(`📧 Contact Form Submission:
        Name: ${name}
        Email: ${email}
        Subject: ${subject || 'No subject'}
        Message: ${message}`);
        
        res.json({ 
            success: true, 
            message: 'Message sent successfully'
        });
    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

/**
 * Sync data from Google Sheets (admin only)
 */
exports.syncData = async (req, res) => {
    try {
        // TODO: Add admin authentication check
        // TODO: Add rate limiting
        
        const { type } = req.query; // 'publications', 'blog', or 'all'
        
        let result = {};
        
        if (type === 'publications' || type === 'all') {
            result.publications = await googleSheetsService.syncPublications();
        }
        
        if (type === 'blog' || type === 'all') {
            result.blog = await googleSheetsService.syncBlogPosts();
        }
        
        res.json({
            success: true,
            message: 'Sync completed successfully',
            result
        });
    } catch (error) {
        console.error('Error syncing data:', error);
        res.status(500).json({ 
            error: 'Failed to sync data',
            details: error.message 
        });
    }
};

/**
 * Get hero slideshow data from Google Sheets
 */
exports.getHeroSlides = async (req, res) => {
    try {
        const sheetUrl = 'https://script.google.com/macros/s/AKfycbz14__Ju9ZleZGkhnAAqq19NS1G9BsuzQcTgm-48Bd4Z0006I3Dz4FPx1gjErmKlKjF/exec';
        const response = await axios.get(sheetUrl, {
            timeout: 30000,
            headers: { Accept: 'application/json' }
        });

        let payload = response.data;
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload);
            } catch (error) {
                return res.json({ success: false, slides: [] });
            }
        }

        const rows = Array.isArray(payload)
            ? payload
            : payload?.data || payload?.rows || payload?.records || [];

        const slides = Array.isArray(rows)
            ? rows.map((item) => ({
                headline: item.title || item.headline || item.heading || 'Pharmis Optimus Nexus',
                subtitle: item.subtitle || item.description || item.text || 'Advancing pharmaceutical knowledge and innovation.',
                label: item.label || item.category || item.tag || 'Featured',
                image: item.image || item.image_url || item.img || item.photo || '/images/aa.jpg'
            }))
            : [];

        res.json({ success: true, slides });
    } catch (error) {
        console.error('Error fetching hero slides:', error.message);
        res.json({ success: false, slides: [] });
    }
};