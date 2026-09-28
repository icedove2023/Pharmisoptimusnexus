// src/config/index.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Admin area URL prefix. Not linked from anywhere on the site: admins open it by
// typing the address. Set ADMIN_PATH to something only your team knows.
const RESERVED_ADMIN_PATHS = ['/', '/api', '/blog', '/publications', '/teams', '/about', '/contact', '/css', '/js', '/images', '/health'];

function resolveAdminPath(value) {
    const fallback = '/studio';
    let candidate = String(value || fallback).trim().toLowerCase();
    if (!candidate.startsWith('/')) candidate = '/' + candidate;
    candidate = candidate.replace(/\/+$/, '');
    const valid = /^\/[a-z0-9][a-z0-9_-]*(\/[a-z0-9][a-z0-9_-]*)*$/.test(candidate);
    if (!valid || RESERVED_ADMIN_PATHS.includes(candidate)) {
        console.warn(`ADMIN_PATH "${value}" is not usable, falling back to ${fallback}`);
        return fallback;
    }
    return candidate;
}

module.exports = {
    // Admin
    adminPath: resolveAdminPath(process.env.ADMIN_PATH),

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

    // Secret used to hash anonymous visitor and IP identifiers
    secret: process.env.SESSION_SECRET,

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