// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const ejs = require('ejs');
const config = require('./src/config');
const { icon } = require('./src/utils/icons');
const { visitor } = require('./src/middleware/visitor');

const app = express();

// Behind Vercel's proxy: use the real client IP for rate limiting and secure cookies.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;

// ============================================================
// PRODUCTION CHECKS
// ============================================================
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Running in ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);

// ============================================================
// MIDDLEWARE
// ============================================================

// Security
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: "same-origin" },
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
}));

// CORS - Dynamic for production/development
const allowedOrigins = isProduction 
    ? [
        'https://pharmisoptimusnexus.vercel.app',
        'https://pharmisoptimusnexus-git-main.vercel.app',
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
        process.env.CUSTOM_DOMAIN || null
    ].filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:3001'];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1 || !isProduction) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression.filter(req, res);
    }
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================================
// SECRET CHECK
// ============================================================
// SESSION_SECRET keys the hashes used for anonymous visitor and IP identifiers.
// There is no server-side session store: admin sign-in uses Supabase Auth
// tokens in httpOnly cookies (see src/middleware/adminSession.js).
if (isProduction && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set in production');
}

// ============================================================
// STATIC FILES - With caching for production
// ============================================================
const staticOptions = isProduction 
    ? { 
        maxAge: '7d', 
        immutable: true,
        etag: true,
        lastModified: true
      }
    : {};

// CSS with caching
app.use('/css', express.static(path.join(__dirname, 'src/public/css'), staticOptions));

// JS with caching
app.use('/js', express.static(path.join(__dirname, 'src/public/js'), staticOptions));

// Images with longer caching
app.use('/images', express.static(path.join(__dirname, 'src/public/images'), {
    maxAge: isProduction ? '30d' : '0',
    immutable: isProduction
}));

// General static files
app.use(express.static(path.join(__dirname, 'src/public')));

// Favicon
app.use('/favicon.ico', express.static(path.join(__dirname, 'src/public/images/favicon.ico')));

// Anonymous visitor id (first-party cookie) used to de-duplicate views and likes.
// Not applied to the admin area.
app.use(visitor({ isProduction, skipPrefix: config.adminPath }));

// ============================================================
// VIEW ENGINE
// ============================================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

// Make theme and user available to all views
app.use((req, res, next) => {
    res.locals.theme = 'dark';
    res.locals.icon = icon;
    res.locals.user = null;
    res.locals.isProduction = isProduction;
    res.locals.baseUrl = process.env.BASE_URL || config.baseUrl || '';
    next();
});

// ============================================================
// CUSTOM RENDER WITH LAYOUT
// ============================================================
app.use((req, res, next) => {
    const originalRender = res.render.bind(res);

    res.render = function(view, options = {}, callback) {
        // Handle callback
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }

        // Merge options with defaults
        const pageLocals = {
            theme: 'dark',
            title: '',
            metaDescription: 'Pharmis Optimus Nexus – Advancing Pharmaceutical Knowledge, Research, and Innovation',
            metaKeywords: 'pharmaceutical, research, innovation, health, pharmacy',
            metaRobots: 'index, follow',
            ogTitle: '',
            ogDescription: '',
            ogType: 'website',
            ogUrl: '',
            ogImage: '/images/og-image.jpg',
            twitterCard: 'summary_large_image',
            canonicalUrl: '',
            pageStyles: '',
            pageScripts: '',
            structuredData: null,
            flash: null,
            currentPage: 'home',
            ...res.locals,
            ...options
        };

        const viewPath = path.join(app.get('views'), view.endsWith('.ejs') ? view : `${view}.ejs`);
        // Public pages use layouts/main. The admin area sets res.locals.layout.
        const layoutName = pageLocals.layout || 'layouts/main';
        const layoutPath = path.join(app.get('views'), `${layoutName}.ejs`);

        // Render the page content
        ejs.renderFile(viewPath, pageLocals, (err, html) => {
            if (err) {
                console.error('Error rendering view:', err);
                if (callback) return callback(err);
                return next(err);
            }

            // Prepare layout locals
            const layoutLocals = {
                ...pageLocals,
                body: html,
                title: pageLocals.title || 'Pharmis Optimus Nexus',
                metaDescription: pageLocals.metaDescription || 'Pharmis Optimus Nexus – Advancing Pharmaceutical Knowledge, Research, and Innovation',
                metaKeywords: pageLocals.metaKeywords || 'pharmaceutical, research, innovation, health, pharmacy',
                metaRobots: pageLocals.metaRobots || 'index, follow',
                ogTitle: pageLocals.ogTitle || pageLocals.title || 'Pharmis Optimus Nexus',
                ogDescription: pageLocals.ogDescription || pageLocals.metaDescription || 'Advancing Pharmaceutical Knowledge, Research, and Innovation',
                ogType: pageLocals.ogType || 'website',
                ogUrl: pageLocals.ogUrl || '',
                ogImage: pageLocals.ogImage || '/images/og-image.jpg',
                twitterCard: pageLocals.twitterCard || 'summary_large_image',
                canonicalUrl: pageLocals.canonicalUrl || '',
                pageStyles: pageLocals.pageStyles || '',
                pageScripts: pageLocals.pageScripts || '',
                structuredData: pageLocals.structuredData || null,
                flash: pageLocals.flash || null,
                currentPage: pageLocals.currentPage || 'home',
                theme: pageLocals.theme || 'dark',
                user: pageLocals.user || null,
                isProduction: isProduction
            };

            // Render with layout
            ejs.renderFile(layoutPath, layoutLocals, (layoutErr, finalHtml) => {
                if (layoutErr) {
                    console.error('Error rendering layout:', layoutErr);
                    if (callback) return callback(layoutErr);
                    return next(layoutErr);
                }

                if (callback) {
                    return callback(null, finalHtml);
                }

                res.send(finalHtml);
            });
        });
    };

    next();
});

// ============================================================
// ROUTES
// ============================================================

// Admin area (not linked from the public site)
app.use(config.adminPath, require('./src/routes/admin'));

// Web routes
const webRoutes = require('./src/routes/web');
app.use('/', webRoutes);

// API routes
const apiRoutes = require('./src/routes/api');
app.use('/api', apiRoutes);

// Health check endpoint (for monitoring)
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler - Keep as last route
app.use((req, res) => {
    res.status(404).render('pages/error', {
        title: '404 - Page Not Found',
        theme: 'dark',
        error: {
            message: 'The page you are looking for does not exist.',
            status: 404
        }
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    console.error('   Stack:', err.stack);
    console.error('   Request:', req.method, req.url);
    console.error('   IP:', req.ip || req.connection?.remoteAddress);

    // API errors
    if (req.path && req.path.startsWith('/api')) {
        return res.status(err.status || 500).json({
            success: false,
            error: isProduction ? 'Internal server error' : err.message,
            ...(isProduction ? {} : { stack: err.stack })
        });
    }

    // Render error page
    const status = err.status || 500;
    const message = isProduction 
        ? 'Something went wrong. Please try again.' 
        : err.message;

    res.status(status).render('pages/error', {
        title: status === 404 ? '404 - Page Not Found' : 'Error',
        theme: 'dark',
        error: {
            message: message,
            status: status,
            ...(isProduction ? {} : { stack: err.stack })
        }
    });
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================
const shutdown = () => {
    console.log('Shutting down gracefully...');
    
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    // Don't exit in production, just log
    if (!isProduction) {
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise);
    console.error('Reason:', reason);
    // Don't exit in production, just log
    if (!isProduction) {
        process.exit(1);
    }
});

// ============================================================
// START SERVER
// ============================================================
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Base URL: ${process.env.BASE_URL || `http://localhost:${PORT}`}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;