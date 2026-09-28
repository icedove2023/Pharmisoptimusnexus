// src/utils/cookies.js
// Minimal Cookie header parser. Express 5 can set cookies (res.cookie) but does
// not parse them without an extra package, and we only need a few values.

function parseCookies(header) {
    const out = Object.create(null);
    if (!header || typeof header !== 'string') return out;

    for (const part of header.split(';')) {
        const eq = part.indexOf('=');
        if (eq < 0) continue;
        const name = part.slice(0, eq).trim();
        if (!name || name in out) continue;

        let value = part.slice(eq + 1).trim();
        if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        }
        try {
            out[name] = decodeURIComponent(value);
        } catch (err) {
            out[name] = value;
        }
    }
    return out;
}

module.exports = { parseCookies };
