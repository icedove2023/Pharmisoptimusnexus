// src/utils/constants.js
module.exports = {
    // Publication categories
    PUBLICATION_CATEGORIES: [
        'Review Articles',
        'AI & Biotechnology',
        'Research Articles',
        'Others'
    ],
    
    // Blog categories
    BLOG_CATEGORIES: [
        'Public Health Awareness',
        'Mental Health',
        'Lifestyle & Wellness',
        'Community Health',
        'Health News & Updates'
    ],
    
    // Pagination defaults
    PAGINATION: {
        DEFAULT_LIMIT: 6,
        MAX_LIMIT: 50,
        DEFAULT_PAGE: 1
    },
    
    // Comment limits
    COMMENTS: {
        MAX_LENGTH: 5000,
        MIN_LENGTH: 2,
        MAX_PER_PAGE: 20
    },
    
    // Cache TTLs (in seconds)
    CACHE: {
        POSTS: 300,      // 5 minutes
        POST: 600,       // 10 minutes
        CATEGORIES: 3600, // 1 hour
        TAGS: 3600       // 1 hour
    },
    
    // Rate limiting
    RATE_LIMIT: {
        WINDOW_MS: 15 * 60 * 1000, // 15 minutes
        MAX_REQUESTS: 100
    }
};