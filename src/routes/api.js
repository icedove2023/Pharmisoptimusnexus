// src/routes/api.js
const express = require('express');
const router = express.Router();
const { apiController, adminController } = require('../controllers');
const rateLimiter = require('../middleware/rateLimiter');

// ============================================================
// VIEW TRACKING - with rate limiting
// ============================================================
router.post('/views/:postId', rateLimiter.viewLimiter, apiController.trackView);
router.get('/views/:postId', rateLimiter.generalLimiter, apiController.getViewCount);

// ============================================================
// LIKES - with rate limiting
// ============================================================
router.post('/likes/:postId', rateLimiter.likeLimiter, apiController.toggleLike);
router.get('/likes/:postId', rateLimiter.generalLimiter, apiController.getLikeCount);

// ============================================================
// COMMENTS - with rate limiting
// ============================================================
router.get('/comments/:postId', rateLimiter.generalLimiter, apiController.getComments);
router.post('/comments/:postId', rateLimiter.commentLimiter, apiController.addComment);
router.delete('/comments/:commentId', rateLimiter.authLimiter, apiController.deleteComment);

// ============================================================
// CONTACT - with rate limiting
// ============================================================
router.post('/contact', rateLimiter.contactLimiter, apiController.submitContact);

// ============================================================
// ANALYTICS - with rate limiting
// ============================================================
router.get('/analytics/popular', rateLimiter.generalLimiter, apiController.getPopularPosts);
router.get('/analytics/views', rateLimiter.generalLimiter, apiController.getViewAnalytics);

// ============================================================
// SYNC - with stricter rate limiting
// ============================================================
router.post('/sync', rateLimiter.authLimiter, apiController.syncData);

// ============================================================
// HERO SLIDES
// ============================================================
router.get('/hero-slides', rateLimiter.generalLimiter, apiController.getHeroSlides);

// ============================================================
// TEST ROUTE - for testing rate limiting
// ============================================================
router.get('/test-rate-limit', rateLimiter.testLimiter, (req, res) => {
    res.json({ success: true, message: 'Rate limit test passed!' });
});

module.exports = router;