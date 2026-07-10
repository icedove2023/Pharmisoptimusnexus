// src/middleware/errorHandler.js
const config = require('../config');

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
};

/**
 * Global error handler
 */
const errorHandler = (err, req, res, next) => {
    // Get status code
    const status = err.status || 500;
    
    // Get error message
    const message = err.message || 'Internal server error';
    
    // Log error
    console.error('❌ Error:', err);
    console.error('   Status:', status);
    console.error('   Message:', message);
    console.error('   Stack:', err.stack);
    console.error('   Request:', req.method, req.url);
    console.error('   IP:', req.ip || req.connection.remoteAddress);
    
    // Check if it's an API request
    if (req.path && req.path.startsWith('/api') || req.xhr || req.headers.accept?.includes('application/json')) {
        return res.status(status).json({
            error: message,
            status: status,
            timestamp: new Date().toISOString(),
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }
    
    // Render error page
    res.status(status).render('pages/error', {
        title: status === 404 ? 'Page Not Found' : 'Error',
        currentPage: 'error',
        error: process.env.NODE_ENV === 'development' ? {
            message: message,
            stack: err.stack,
            status: status
        } : {
            message: status === 404 ? 'The page you are looking for does not exist.' : 'Something went wrong. Please try again.',
            status: status
        }
    });
};

/**
 * Validation error handler
 */
const validationErrorHandler = (err, req, res, next) => {
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: err.message,
            details: err.details || []
        });
    }
    next(err);
};

/**
 * Database error handler
 */
const dbErrorHandler = (err, req, res, next) => {
    if (err.name === 'SequelizeError' || err.name === 'PostgresError') {
        console.error('Database error:', err);
        return res.status(503).json({
            error: 'Database Error',
            message: 'We are experiencing database issues. Please try again later.'
        });
    }
    next(err);
};

/**
 * Authentication error handler
 */
const authErrorHandler = (err, req, res, next) => {
    if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or expired authentication token'
        });
    }
    next(err);
};

/**
 * Rate limit error handler
 */
const rateLimitErrorHandler = (err, req, res, next) => {
    if (err.name === 'RateLimitError') {
        return res.status(429).json({
            error: 'Too Many Requests',
            message: 'Please wait before trying again'
        });
    }
    next(err);
};

module.exports = {
    notFoundHandler,
    errorHandler,
    validationErrorHandler,
    dbErrorHandler,
    authErrorHandler,
    rateLimitErrorHandler
};