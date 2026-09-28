// src/middleware/visitor.js
// Gives every browser an anonymous first-party visitor id (cookie) so views and
// likes can be de-duplicated. The database only ever sees a keyed hash of it.
//
// This is a functional cookie: it is random, holds no personal data and is used
// only to stop the same browser inflating counts.

const crypto = require('crypto');
const { parseCookies } = require('../utils/cookies');
const { hmac } = require('../utils/privacy');

const COOKIE_NAME = 'pon_vid';
const VALID_ID = /^[a-f0-9]{32}$/;
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

function visitor({ isProduction = false, skipPrefix = null } = {}) {
    return function visitorMiddleware(req, res, next) {
        if (skipPrefix && (req.path === skipPrefix || req.path.startsWith(skipPrefix + '/'))) {
            return next();
        }

        const cookies = parseCookies(req.headers.cookie);
        let id = cookies[COOKIE_NAME];

        if (!id || !VALID_ID.test(id)) {
            id = crypto.randomBytes(16).toString('hex');
            res.cookie(COOKIE_NAME, id, {
                httpOnly: true,
                sameSite: 'lax',
                secure: isProduction,
                maxAge: ONE_YEAR_MS,
                path: '/'
            });
        }

        req.visitorHash = hmac(id);
        next();
    };
}

module.exports = { visitor, COOKIE_NAME };
