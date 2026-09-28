// src/middleware/adminSession.js
// Cookie-based admin sessions on top of Supabase Auth.
//
// Sign-in stores the Supabase access and refresh tokens in httpOnly cookies that
// are scoped to the admin URL prefix, so the public site never receives them.
// Cookies are SameSite=Strict and every state-changing request must also pass
// the same-origin check below.

const { createAuthClient } = require('../config/supabase');
const { parseCookies } = require('../utils/cookies');
const { resolveUserFromToken, roleOf } = require('./auth');

const ACCESS_COOKIE = 'pon_at';
const REFRESH_COOKIE = 'pon_rt';
const DEFAULT_ACCESS_SECONDS = 60 * 60;
const REFRESH_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function cookieOptions(adminPath, isProduction, maxAgeMs) {
    return {
        httpOnly: true,
        sameSite: 'strict',
        secure: isProduction,
        path: adminPath,
        maxAge: maxAgeMs
    };
}

function setSessionCookies(res, session, { adminPath, isProduction }) {
    const accessSeconds = Number(session.expires_in) > 0 ? Number(session.expires_in) : DEFAULT_ACCESS_SECONDS;
    res.cookie(ACCESS_COOKIE, session.access_token, cookieOptions(adminPath, isProduction, accessSeconds * 1000));
    if (session.refresh_token) {
        res.cookie(REFRESH_COOKIE, session.refresh_token, cookieOptions(adminPath, isProduction, REFRESH_MAX_AGE_MS));
    }
}

function clearSessionCookies(res, { adminPath, isProduction }) {
    const options = { httpOnly: true, sameSite: 'strict', secure: isProduction, path: adminPath };
    res.clearCookie(ACCESS_COOKIE, options);
    res.clearCookie(REFRESH_COOKIE, options);
}

function wantsJson(req) {
    const accept = req.get('accept') || '';
    return accept.includes('application/json') && !accept.includes('text/html');
}

/**
 * Headers for every admin response: never indexed, never cached, and the admin
 * prefix is available to templates.
 */
function adminHeaders({ adminPath }) {
    return function (req, res, next) {
        res.set('X-Robots-Tag', 'noindex, nofollow');
        res.set('Cache-Control', 'no-store');
        res.locals.adminPath = adminPath;
        res.locals.layout = 'admin/layout';
        res.locals.metaRobots = 'noindex, nofollow';
        next();
    };
}

/**
 * Reject cross-site form posts and fetches. Browsers always send Origin on
 * POST; if it is missing we fall back to Referer.
 */
function sameOriginGuard(req, res, next) {
    const method = req.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

    const source = req.get('origin') || req.get('referer');
    const host = req.get('host');
    let sourceHost = null;
    try {
        sourceHost = source ? new URL(source).host : null;
    } catch (err) {
        sourceHost = null;
    }

    if (!sourceHost || sourceHost !== host) {
        return res.status(403).send('Forbidden');
    }
    return next();
}

/**
 * Require a signed-in admin session with one of the given roles.
 * Refreshes an expired access token when a refresh token is present.
 */
function adminGuard({ adminPath, isProduction = false, roles }) {
    const cookieCtx = { adminPath, isProduction };

    function deny(req, res) {
        if (wantsJson(req)) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        return res.redirect(303, `${adminPath}/login`);
    }

    function forbid(req, res) {
        if (wantsJson(req)) {
            return res.status(403).json({ success: false, error: 'Insufficient permissions' });
        }
        return res.status(403).render('admin/error', {
            title: 'Not allowed',
            heading: 'Not allowed',
            message: 'Your account does not have access to this page.'
        });
    }

    return async function (req, res, next) {
        const cookies = parseCookies(req.headers.cookie);
        let user = null;

        const accessToken = cookies[ACCESS_COOKIE];
        if (accessToken) {
            const result = await resolveUserFromToken(accessToken);
            if (result.status === 503) {
                return res.status(503).send('Authentication service unavailable. Try again shortly.');
            }
            if (result.user) user = result.user;
        }

        if (!user && cookies[REFRESH_COOKIE]) {
            try {
                const { data, error } = await createAuthClient().auth.refreshSession({
                    refresh_token: cookies[REFRESH_COOKIE]
                });
                if (!error && data && data.session && data.session.user) {
                    user = data.session.user;
                    setSessionCookies(res, data.session, cookieCtx);
                }
            } catch (err) {
                console.error('Admin session refresh failed:', err.message);
            }
        }

        if (!user) {
            clearSessionCookies(res, cookieCtx);
            return deny(req, res);
        }

        const role = roleOf(user);
        if (!roles.includes(role)) {
            return forbid(req, res);
        }

        req.admin = { id: user.id, email: user.email, role };
        res.locals.admin = req.admin;
        return next();
    };
}

module.exports = {
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    setSessionCookies,
    clearSessionCookies,
    adminHeaders,
    sameOriginGuard,
    adminGuard
};
