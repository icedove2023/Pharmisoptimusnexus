// src/controllers/adminController.js
const { Post, Comment, Like, View } = require('../models');
const googleSheetsService = require('../services/googleSheetsService');
const config = require('../config');

/**
 * Admin dashboard (admin only)
 */
exports.getDashboard = async (req, res) => {
    try {
        // TODO: Add admin authentication check
        
        // Get stats
        const allPosts = await Post.findAll({ limit: 1000 });
        const totalPosts = allPosts.total || 0;
        
        const totalComments = await Comment.getCount();
        const totalLikes = await Like.getCount();
        const totalViews = await View.getCount();
        
        // Get recent activity
        const recentPosts = allPosts.posts.slice(0, 5);
        
        res.render('pages/admin/dashboard', {
            title: 'Admin Dashboard',
            currentPage: 'admin',
            stats: {
                totalPosts,
                totalComments,
                totalLikes,
                totalViews
            },
            recentPosts
        });
    } catch (error) {
        console.error('Error in admin dashboard:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            error: {
                message: 'Failed to load admin dashboard',
                status: 500
            }
        });
    }
};

/**
 * Trigger sync (admin only)
 */
exports.triggerSync = async (req, res) => {
    try {
        // TODO: Add admin authentication check
        
        const result = await googleSheetsService.fullSync();
        
        res.json({
            success: true,
            message: 'Sync completed',
            result
        });
    } catch (error) {
        console.error('Error triggering sync:', error);
        res.status(500).json({ error: 'Failed to sync data' });
    }
};