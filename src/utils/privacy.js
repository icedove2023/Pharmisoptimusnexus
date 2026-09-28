// src/utils/privacy.js
// One-way hashing for anonymous identifiers (visitor cookie, IP address).
// The database never stores the raw values.

const crypto = require('crypto');

function getSecret() {
    return process.env.SESSION_SECRET || 'dev-only-session-secret';
}

function hmac(value) {
    return crypto.createHmac('sha256', getSecret()).update(String(value)).digest('hex');
}

module.exports = { hmac };
