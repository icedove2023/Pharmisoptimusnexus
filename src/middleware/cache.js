// src/middleware/cache.js
const cacheService = require('../services/cacheService');

/**
 * Cache middleware for Express routes
 */
const cache = (duration = 300) => {
    return (req, res, next) => {
        // Skip cache for authenticated users (optional)
        if (req.session && req.session.user) {
            return next();
        }
        
        // Skip cache for POST, PUT, DELETE requests
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
            return next();
        }
        
        // Skip cache if query string has no-cache
        if (req.query.noCache === 'true') {
            return next();
        }
        
        // Generate cache key from URL
        const key = `route:${req.originalUrl || req.url}`;
        
        // Check if response is cached
        const cached = cacheService.get(key);
        if (cached !== null) {
            console.log(`📦 Cache hit: ${key}`);
            return res.json(cached);
        }
        
        // Store original send method
        const originalSend = res.send;
        const originalJson = res.json;
        
        // Override res.json to cache response
        res.json = function(data) {
            // Cache the response if successful
            if (res.statusCode === 200) {
                cacheService.set(key, data, duration);
                console.log(`💾 Cache set: ${key}`);
            }
            
            // Call original json method
            return originalJson.call(this, data);
        };
        
        // Override res.send to also cache
        res.send = function(data) {
            if (res.statusCode === 200) {
                // Try to parse as JSON if it's a string
                let jsonData = data;
                if (typeof data === 'string') {
                    try {
                        jsonData = JSON.parse(data);
                        cacheService.set(key, jsonData, duration);
                        console.log(`💾 Cache set: ${key}`);
                    } catch (e) {
                        // Not JSON, don't cache
                    }
                } else {
                    cacheService.set(key, data, duration);
                    console.log(`💾 Cache set: ${key}`);
                }
            }
            
            return originalSend.call(this, data);
        };
        
        next();
    };
};

/**
 * Clear cache for a specific pattern
 */
const clearCache = (pattern) => {
    return (req, res, next) => {
        const count = cacheService.invalidatePattern(pattern);
        console.log(`🧹 Cache cleared: ${count} entries for pattern "${pattern}"`);
        next();
    };
};

/**
 * Clear cache after post update
 */
const clearCacheAfterUpdate = (patterns = ['route:/blog/*', 'route:/publications/*']) => {
    return (req, res, next) => {
        // Store the original send method
        const originalJson = res.json;
        
        res.json = function(data) {
            // If request was successful, clear cache
            if (res.statusCode === 200 && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
                patterns.forEach(pattern => {
                    const count = cacheService.invalidatePattern(pattern);
                    console.log(`🧹 Cache cleared: ${count} entries for pattern "${pattern}"`);
                });
            }
            
            return originalJson.call(this, data);
        };
        
        next();
    };
};

/**
 * Cache HTML pages (server-side rendering)
 */
const cachePage = (duration = 300) => {
    return (req, res, next) => {
        // Skip cache for authenticated users
        if (req.session && req.session.user) {
            return next();
        }
        
        // Skip cache for POST requests
        if (req.method !== 'GET') {
            return next();
        }
        
        const key = `page:${req.originalUrl || req.url}`;
        const cached = cacheService.get(key);
        
        if (cached !== null) {
            console.log(`📦 Page cache hit: ${key}`);
            return res.send(cached);
        }
        
        // Store original render method
        const originalRender = res.render.bind(res);
        
        res.render = function(view, options, callback) {
            // Call original render
            const result = originalRender(view, options, (err, html) => {
                if (!err && res.statusCode === 200) {
                    cacheService.set(key, html, duration);
                    console.log(`💾 Page cached: ${key}`);
                }
                
                if (callback) {
                    callback(err, html);
                }
            });
            
            return result;
        };
        
        next();
    };
};

/**
 * Cache control headers middleware
 */
const cacheControl = (maxAge = 3600) => {
    return (req, res, next) => {
        res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
        res.setHeader('Expires', new Date(Date.now() + maxAge * 1000).toUTCString());
        next();
    };
};

/**
 * No cache headers (for dynamic content)
 */
const noCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};

module.exports = {
    cache,
    cachePage,
    cacheControl,
    noCache,
    clearCache,
    clearCacheAfterUpdate
};