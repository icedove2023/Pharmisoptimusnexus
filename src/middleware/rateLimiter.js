// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests',
        message: 'Please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip rate limiting for admin users (optional)
        return req.session && req.session.user && req.session.user.role === 'admin';
    }
});

// Stricter rate limiter for authentication
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 login attempts
    message: {
        error: 'Too many login attempts',
        message: 'Please try again after 15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Comment rate limiter
const commentLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 comments per hour
    message: {
        error: 'Too many comments',
        message: 'Please wait before posting more comments'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Like rate limiter
const likeLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Limit each IP to 50 likes per hour
    message: {
        error: 'Too many likes',
        message: 'Please slow down'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// View tracking rate limiter
const viewLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 200, // Limit each IP to 200 views per hour
    message: {
        error: 'Too many requests',
        message: 'Please slow down'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Search rate limiter
const searchLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 30, // Limit each IP to 30 searches per hour
    message: {
        error: 'Too many searches',
        message: 'Please wait before searching again'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Contact form rate limiter
const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit each IP to 5 contact form submissions per hour
    message: {
        error: 'Too many submissions',
        message: 'Please wait before sending another message'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Test-specific limiter with lower threshold for testing
const testLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // Limit each IP to 5 requests per minute for testing
    message: {
        error: 'Too many requests',
        message: 'Rate limit exceeded for testing'
    },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    generalLimiter,
    authLimiter,
    commentLimiter,
    likeLimiter,
    viewLimiter,
    searchLimiter,
    contactLimiter,
    testLimiter
};