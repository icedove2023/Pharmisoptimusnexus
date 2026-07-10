// src/middleware/security.js
/**
 * Additional security middleware
 */

/**
 * Prevent parameter pollution
 */
function preventParameterPollution(req, res, next) {
    // Check for duplicate query parameters
    const query = req.query;
    const duplicateKeys = [];
    
    for (const key in query) {
        if (Array.isArray(query[key]) && query[key].length > 1) {
            duplicateKeys.push(key);
        }
    }
    
    if (duplicateKeys.length > 0) {
        return res.status(400).json({
            error: 'Bad Request',
            message: 'Duplicate query parameters are not allowed',
            keys: duplicateKeys
        });
    }
    
    next();
}

/**
 * Sanitize user input
 */
function sanitizeInput(req, res, next) {
    // Sanitize query parameters
    if (req.query) {
        for (const key in req.query) {
            if (typeof req.query[key] === 'string') {
                req.query[key] = sanitizeString(req.query[key]);
            }
        }
    }
    
    // Sanitize body parameters
    if (req.body) {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeString(req.body[key]);
            }
        }
    }
    
    next();
}

/**
 * Sanitize a string
 */
function sanitizeString(str) {
    if (!str) return str;
    
    // Remove HTML tags
    let sanitized = str.replace(/<[^>]*>/g, '');
    
    // Remove script content
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove on* event handlers
    sanitized = sanitized.replace(/\son\w+\s*=/gi, ' oninvalid=');
    
    // Remove javascript: protocol
    sanitized = sanitized.replace(/javascript:/gi, 'javascript&#58;');
    
    // Remove data: protocol
    sanitized = sanitized.replace(/data:/gi, 'data&#58;');
    
    return sanitized;
}

/**
 * Add security headers for API responses
 */
function apiSecurityHeaders(req, res, next) {
    // Only for API routes
    if (req.path && req.path.startsWith('/api')) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
    }
    next();
}

/**
 * Prevent open redirects
 */
function preventOpenRedirect(req, res, next) {
    const redirectUrl = req.query.redirect || req.body.redirect || '';
    
    if (redirectUrl) {
        // Only allow relative URLs or same domain
        try {
            const url = new URL(redirectUrl, `http://${req.headers.host}`);
            if (url.hostname !== req.hostname) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Invalid redirect URL'
                });
            }
        } catch (e) {
            // If URL is invalid, check if it's a relative path
            if (redirectUrl.startsWith('http://') || redirectUrl.startsWith('https://')) {
                return res.status(400).json({
                    error: 'Bad Request',
                    message: 'Invalid redirect URL'
                });
            }
        }
    }
    
    next();
}

module.exports = {
    preventParameterPollution,
    sanitizeInput,
    apiSecurityHeaders,
    preventOpenRedirect
};