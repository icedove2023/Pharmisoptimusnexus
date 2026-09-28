// src/utils/request.js
// Small request helpers shared by the API and admin code.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http-client|okhttp/i;

function isUuid(value) {
    return typeof value === 'string' && UUID_RE.test(value);
}

// Requests without a user agent, or with a known crawler/tool agent, are never
// counted as views.
function isBot(userAgent) {
    if (!userAgent || typeof userAgent !== 'string') return true;
    return BOT_RE.test(userAgent);
}

module.exports = { isUuid, isBot };
