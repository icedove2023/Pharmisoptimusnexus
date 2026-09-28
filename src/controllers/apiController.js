// src/controllers/apiController.js
const { Post, Comment, Engagement, ContactMessage } = require('../models');
const HeroSlide = require('../models/HeroSlide');
const { validateEmail, validateComment, validateAuthor, sanitizeString } = require('../utils/validation');
const { isUuid, isBot } = require('../utils/request');
const { hmac } = require('../utils/privacy');
const emailService = require('../services/emailService');
const config = require('../config');

/**
 * Count a view. Called once per page load by public/js/engagement.js after the
 * visitor has stayed on the page for a few seconds. Crawlers are ignored, and
 * the database counts one view per visitor per post per day.
 */
exports.trackView = async (req, res) => {
    const { postId } = req.params;

    if (!isUuid(postId)) {
        return res.status(400).json({ success: false, error: 'Invalid post id' });
    }

    if (isBot(req.get('user-agent'))) {
        return res.json({ success: true, counted: false });
    }

    try {
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        const result = await Engagement.recordView(postId, req.visitorHash, req.get('referer'));
        res.json({ success: true, counted: result.counted, views: result.views });
    } catch (error) {
        console.error('Error tracking view:', error);
        res.status(500).json({ success: false, error: 'Failed to record view' });
    }
};

/**
 * Get view count
 */
exports.getViewCount = async (req, res) => {
    try {
        const { postId } = req.params;
        if (!isUuid(postId)) {
            return res.status(400).json({ success: false, error: 'Invalid post id' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        res.json({ success: true, views: post.views || 0 });
    } catch (error) {
        console.error('Error getting view count:', error);
        res.status(500).json({ success: false, error: 'Failed to get view count' });
    }
};

/**
 * Like or unlike a post. One like per visitor per post.
 */
exports.toggleLike = async (req, res) => {
    try {
        const { postId } = req.params;
        if (!isUuid(postId)) {
            return res.status(400).json({ success: false, error: 'Invalid post id' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        const result = await Engagement.toggleLike(postId, req.visitorHash);
        res.json({ success: true, liked: result.liked, likes: result.likes });
    } catch (error) {
        console.error('Error toggling like:', error);
        res.status(500).json({ success: false, error: 'Failed to update like' });
    }
};

/**
 * Get like count and whether this visitor has liked the post
 */
exports.getLikeCount = async (req, res) => {
    try {
        const { postId } = req.params;
        if (!isUuid(postId)) {
            return res.status(400).json({ success: false, error: 'Invalid post id' });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, error: 'Post not found' });
        }

        const liked = await Engagement.hasLiked(postId, req.visitorHash);
        res.json({ success: true, likes: post.likes || 0, liked });
    } catch (error) {
        console.error('Error getting like count:', error);
        res.status(500).json({ success: false, error: 'Failed to get like count' });
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
 * Get view analytics (admin only, protected in routes/api.js)
 */
exports.getViewAnalytics = async (req, res) => {
    try {
        const days = parseInt(req.query.days, 10) || 30;
        const [stats, topPosts] = await Promise.all([
            Engagement.getDailyViews(days),
            Post.getPopular(10)
        ]);

        res.json({ success: true, stats, topPosts });
    } catch (error) {
        console.error('Error getting view analytics:', error);
        res.status(500).json({ error: 'Failed to get analytics' });
    }
};

/**
 * Contact form submission. The message is stored first, so it is never lost if
 * email is down. The email notification is best effort.
 */
exports.submitContact = async (req, res) => {
    try {
        const body = req.body || {};

        // Hidden field that real visitors never fill in. Bots do.
        if (body.website) {
            return res.json({ success: true, message: 'Message sent successfully' });
        }

        const name = sanitizeString(String(body.name || '')).trim();
        const email = String(body.email || '').trim();
        const subject = sanitizeString(String(body.subject || '')).trim();
        const message = sanitizeString(String(body.message || '')).trim();

        if (name.length < 2 || name.length > 100) {
            return res.status(400).json({ error: 'Name is required (2 to 100 characters)' });
        }
        if (!email || email.length > 254 || !validateEmail(email)) {
            return res.status(400).json({ error: 'Valid email is required' });
        }
        if (subject.length > 150) {
            return res.status(400).json({ error: 'Subject is too long (150 characters maximum)' });
        }
        if (message.length < 10 || message.length > 5000) {
            return res.status(400).json({ error: 'Message is required (10 to 5000 characters)' });
        }

        await ContactMessage.create({
            name,
            email,
            subject: subject || null,
            message,
            ipHash: req.ip ? hmac(req.ip) : null,
            userAgent: req.get('user-agent')
        });

        // Best effort: a mail failure must not lose or fail the message.
        try {
            await Promise.race([
                emailService.sendContactNotification({ name, email, subject: subject || 'No subject', message }),
                new Promise((resolve) => setTimeout(resolve, 5000))
            ]);
        } catch (mailError) {
            console.error('Contact notification email failed:', mailError.message);
        }

        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error submitting contact form:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

/**
 * Hero slideshow data, managed from the admin area (Phase 4). If no slides
 * have been added yet, this still returns an empty list and the front end
 * falls back to its three built-in slides.
 */
exports.getHeroSlides = async (req, res) => {
    try {
        const slides = await HeroSlide.listActive();
        res.json({
            success: true,
            slides: slides.map((s) => ({
                image: s.image_url,
                headline: s.headline,
                subtitle: s.subtitle,
                label: s.label,
                link: s.link_url
            }))
        });
    } catch (error) {
        console.error('Error getting hero slides:', error);
        res.json({ success: true, slides: [] });
    }
};
