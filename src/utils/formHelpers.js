// src/utils/formHelpers.js
// Small parsing helpers shared by the blog post and publication admin forms.

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function splitList(raw, { maxItems, maxLength }) {
    if (typeof raw !== 'string') return [];
    const seen = new Set();
    const out = [];
    for (const part of raw.split(',')) {
        const value = part.trim().slice(0, maxLength);
        if (!value || seen.has(value.toLowerCase())) continue;
        seen.add(value.toLowerCase());
        out.push(value);
        if (out.length >= maxItems) break;
    }
    return out;
}

function todayUtc() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * Split a textarea into non-empty, trimmed lines, capped in count and length.
 * Used for the one-item-per-line inputs (references, structured authors).
 */
function splitLines(raw, { maxItems, maxLength }) {
    if (typeof raw !== 'string') return [];
    return raw
        .split('\n')
        .map((line) => line.trim().slice(0, maxLength))
        .filter(Boolean)
        .slice(0, maxItems);
}

module.exports = { DATE_RE, splitList, splitLines, todayUtc };
