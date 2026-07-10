// src/config/index.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

module.exports = {
    // Server
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || 'http://localhost:3000',

    // Supabase
    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        jwtSecret: process.env.SUPABASE_JWT_SECRET
    },

    // Session
    session: {
        secret: process.env.SESSION_SECRET || 'default-secret-change-me',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },

    // Google Sheets
    googleSheets: {
        publicationsUrl: process.env.GOOGLE_SHEETS_PUBLICATIONS_URL,
        blogUrl: process.env.GOOGLE_SHEETS_BLOG_URL
    },

    // Rate Limiting
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100 // limit each IP to 100 requests per windowMs
    },

    // Email
    email: {
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        fromEmail: process.env.FROM_EMAIL || 'noreply@pharmisnexus.com',
        fromName: process.env.FROM_NAME || 'Pharmis Optimus Nexus'
    }
};