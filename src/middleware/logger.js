// src/middleware/logger.js
const fs = require('fs');
const path = require('path');

/**
 * Simple request logger middleware
 */
const logger = (req, res, next) => {
    const start = Date.now();
    const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    const method = req.method;
    const url = req.url;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    
    // Log when response finishes
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const statusColor = status >= 500 ? '\x1b[31m' : // Red
                           status >= 400 ? '\x1b[33m' : // Yellow
                           status >= 300 ? '\x1b[36m' : // Cyan
                           '\x1b[32m'; // Green
        
        const logMessage = `${new Date().toISOString()} ${ip} ${method} ${url} ${statusColor}${status}\x1b[0m ${duration}ms ${userAgent}`;
        
        console.log(logMessage);
        
        // Write to log file (optional)
        if (process.env.ENABLE_FILE_LOGGING === 'true') {
            const logDir = path.join(__dirname, '../../logs');
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }
            
            const logFile = path.join(logDir, `access-${new Date().toISOString().split('T')[0]}.log`);
            const fileMessage = `${new Date().toISOString()} ${ip} ${method} ${url} ${status} ${duration}ms ${userAgent}\n`;
            
            fs.appendFile(logFile, fileMessage, (err) => {
                if (err) console.error('Error writing log:', err);
            });
        }
    });
    
    next();
};

/**
 * Error logger middleware
 */
const errorLogger = (err, req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const method = req.method;
    const url = req.url;
    
    console.error('\x1b[31m%s\x1b[0m', `❌ Error: ${err.message}`);
    console.error('\x1b[90m%s\x1b[0m', `   ${new Date().toISOString()} ${ip} ${method} ${url}`);
    console.error('\x1b[90m%s\x1b[0m', `   Stack: ${err.stack}`);
    
    // Write error to log file
    if (process.env.ENABLE_FILE_LOGGING === 'true') {
        const logDir = path.join(__dirname, '../../logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        const logFile = path.join(logDir, `error-${new Date().toISOString().split('T')[0]}.log`);
        const fileMessage = `${new Date().toISOString()} ${ip} ${method} ${url} ${err.message}\n${err.stack}\n\n`;
        
        fs.appendFile(logFile, fileMessage, (fsErr) => {
            if (fsErr) console.error('Error writing error log:', fsErr);
        });
    }
    
    next(err);
};

/**
 * Performance logger middleware (logs slow requests)
 */
const performanceLogger = (threshold = 1000) => {
    return (req, res, next) => {
        const start = Date.now();
        
        res.on('finish', () => {
            const duration = Date.now() - start;
            if (duration > threshold) {
                const ip = req.ip || req.connection.remoteAddress;
                const method = req.method;
                const url = req.url;
                
                console.warn('\x1b[33m%s\x1b[0m', `⚠️ Slow request: ${duration}ms`);
                console.warn('\x1b[90m%s\x1b[0m', `   ${new Date().toISOString()} ${ip} ${method} ${url}`);
            }
        });
        
        next();
    };
};

/**
 * API request logger (detailed)
 */
const apiLogger = (req, res, next) => {
    const start = Date.now();
    const ip = req.ip || req.connection.remoteAddress;
    const method = req.method;
    const url = req.url;
    const body = req.body;
    const query = req.query;
    const params = req.params;
    
    // Log request
    console.log(`\x1b[36m📨 Request:\x1b[0m ${method} ${url}`);
    if (Object.keys(query).length > 0) {
        console.log(`   Query:`, JSON.stringify(query, null, 2));
    }
    if (Object.keys(params).length > 0) {
        console.log(`   Params:`, JSON.stringify(params, null, 2));
    }
    if (Object.keys(body).length > 0) {
        console.log(`   Body:`, JSON.stringify(body, null, 2));
    }
    
    // Store original json method
    const originalJson = res.json;
    
    res.json = function(data) {
        const duration = Date.now() - start;
        const status = res.statusCode;
        
        console.log(`\x1b[32m✅ Response:\x1b[0m ${status} ${duration}ms`);
        console.log(`   Data:`, JSON.stringify(data, null, 2));
        console.log('---');
        
        return originalJson.call(this, data);
    };
    
    next();
};

module.exports = {
    logger,
    errorLogger,
    performanceLogger,
    apiLogger
};