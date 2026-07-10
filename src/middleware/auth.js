// src/middleware/auth.js
/**
 * Authentication Middleware
 * Protects routes that require authentication
 */

/**
 * Check if user is authenticated
 */
const isAuthenticated = (req, res, next) => {
    // Check if user is logged in (session-based)
    if (req.session && req.session.user) {
        return next();
    }
    
    // Check if there's a token (JWT)
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            // Verify JWT token
            const decoded = verifyToken(token);
            if (decoded) {
                req.user = decoded;
                return next();
            }
        } catch (error) {
            // Token invalid
        }
    }
    
    // Not authenticated
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(401).json({ 
            error: 'Unauthorized', 
            message: 'Please log in to access this resource' 
        });
    }
    
    req.flash('error', 'Please log in to access this page');
    res.redirect('/login');
};

/**
 * Check if user is admin
 */
const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ 
            error: 'Forbidden', 
            message: 'Admin access required' 
        });
    }
    
    req.flash('error', 'Admin access required');
    res.redirect('/');
};

/**
 * Optional authentication - continues even if not authenticated
 */
const optionalAuth = (req, res, next) => {
    // Check if user is logged in
    if (req.session && req.session.user) {
        req.user = req.session.user;
    }
    next();
};

/**
 * Check if user is a contributor (can create/edit posts)
 */
const isContributor = (req, res, next) => {
    if (req.session && req.session.user) {
        const user = req.session.user;
        if (user.role === 'admin' || user.role === 'contributor' || user.role === 'editor') {
            return next();
        }
    }
    
    if (req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(403).json({ 
            error: 'Forbidden', 
            message: 'Contributor access required' 
        });
    }
    
    req.flash('error', 'You do not have permission to perform this action');
    res.redirect('/');
};

/**
 * Verify JWT token (simplified)
 */
function verifyToken(token) {
    // In production, use a proper JWT library
    // For now, just return a mock user
    // const jwt = require('jsonwebtoken');
    // return jwt.verify(token, process.env.JWT_SECRET);
    return { id: 'mock-user-id', role: 'user' };
}

/**
 * Rate limit for authentication attempts
 */
const authRateLimiter = (req, res, next) => {
    const key = `auth_attempts_${req.ip}`;
    const attempts = req.session.authAttempts || 0;
    
    if (attempts >= 5) {
        const waitTime = 15 * 60 * 1000; // 15 minutes
        const lastAttempt = req.session.lastAuthAttempt || Date.now();
        
        if (Date.now() - lastAttempt < waitTime) {
            return res.status(429).json({
                error: 'Too many login attempts',
                message: 'Please wait 15 minutes before trying again'
            });
        } else {
            req.session.authAttempts = 0;
            req.session.lastAuthAttempt = null;
        }
    }
    
    next();
};

/**
 * Track failed login attempts
 */
const trackFailedLogin = (req, res, next) => {
    req.session.authAttempts = (req.session.authAttempts || 0) + 1;
    req.session.lastAuthAttempt = Date.now();
    next();
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isContributor,
    optionalAuth,
    authRateLimiter,
    trackFailedLogin
};