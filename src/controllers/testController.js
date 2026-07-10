// src/controllers/testController.js
const { Post, Comment, Like, View } = require('../models');

/**
 * Test the database connection
 */
async function testConnection(req, res) {
    try {
        // Test post creation
        const testPost = await Post.create({
            title: 'Test Post ' + Date.now(),
            excerpt: 'This is a test post from the backend',
            category: 'Test',
            published_date: new Date().toISOString().split('T')[0],
            authors: ['Test Author'],
            tags: ['test', 'backend']
        });
        
        // Clean up
        await Post.delete(testPost.id);
        
        res.json({
            success: true,
            message: 'Database connection successful!',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Test failed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    testConnection
};