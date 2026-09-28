// src/middleware/auth.js
// Authentication and role checks for admin routes.
//
// Admin accounts are created manually in the Supabase dashboard. A user's role
// is read from app_metadata.role, which can only be changed from the dashboard
// or with the service role key. Never read the role from user_metadata: users
// can edit that themselves.
//
// The access token is sent as an "Authorization: Bearer <token>" header. The
// admin login screen (Phase 1) will obtain it from Supabase Auth.

const { supabaseAdmin } = require('../config/supabase');

const ADMIN_ROLES = ['admin'];
const EDITOR_ROLES = ['admin', 'editor'];

function extractToken(req) {
    const header = req.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : null;
}

/**
 * Validate an access token with Supabase Auth.
 * Returns { user } on success or { status, error } on failure.
 */
async function resolveUserFromToken(token) {
    if (!token) {
        return { status: 401, error: 'Authentication required' };
    }

    try {
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !data || !data.user) {
            return { status: 401, error: 'Invalid or expired token' };
        }
        return { user: data.user };
    } catch (err) {
        console.error('Auth lookup failed:', err.message);
        return { status: 503, error: 'Authentication service unavailable' };
    }
}

function roleOf(user) {
    return (user && user.app_metadata && user.app_metadata.role) || null;
}

/**
 * Express middleware factory: allow only users whose app_metadata.role
 * is one of the given roles.
 */
function requireRole(...roles) {
    return async function (req, res, next) {
        const result = await resolveUserFromToken(extractToken(req));
        if (result.error) {
            return res.status(result.status).json({ success: false, error: result.error });
        }

        const role = roleOf(result.user);
        if (!roles.includes(role)) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }

        req.user = { id: result.user.id, email: result.user.email, role };
        return next();
    };
}

module.exports = {
    resolveUserFromToken,
    roleOf,
    ADMIN_ROLES,
    EDITOR_ROLES,
    requireRole,
    requireAdmin: requireRole(...ADMIN_ROLES),
    requireEditor: requireRole(...EDITOR_ROLES)
};
