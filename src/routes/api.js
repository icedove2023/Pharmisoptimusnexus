// src/routes/api.js
const express = require('express');
const router = express.Router();
const { apiController, adminController } = require('../controllers');
const rateLimiter = require('../middleware/rateLimiter');
const { requireAdmin } = require('../middleware/auth');

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
router.delete('/comments/:commentId', rateLimiter.authLimiter, requireAdmin, apiController.deleteComment);

// ============================================================
// CONTACT - with rate limiting
// ============================================================
router.post('/contact', rateLimiter.contactLimiter, apiController.submitContact);

// ============================================================
// ANALYTICS - with rate limiting
// ============================================================
router.get('/analytics/popular', rateLimiter.generalLimiter, apiController.getPopularPosts);
router.get('/analytics/views', rateLimiter.generalLimiter, requireAdmin, apiController.getViewAnalytics);

// ============================================================
// HERO SLIDES
// ============================================================
router.get('/hero-slides', rateLimiter.generalLimiter, apiController.getHeroSlides);

// ============================================================
// TEST ROUTE - development only, for testing rate limiting
// ============================================================
if (process.env.NODE_ENV !== 'production') {
    router.get('/test-rate-limit', rateLimiter.testLimiter, (req, res) => {
        res.json({ success: true, message: 'Rate limit test passed!' });
    });
}

module.exports = router;