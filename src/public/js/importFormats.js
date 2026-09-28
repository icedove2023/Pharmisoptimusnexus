// public/js/importFormats.js
// Parses a single BibTeX @article entry or a single RIS record into the
// field shape the publication editor form uses, so an admin can paste a
// citation from elsewhere and have most of the form filled in for them.
//
// These are pragmatic, permissive parsers for the common case each format
// is actually used in - not full implementations of either format's formal
// grammar. BibTeX in particular allows nested braces and @string macros
// that this does not attempt to handle; anything it can't make sense of is
// just left out of the result rather than guessed at.
//
// Runs in both Node (for the test suite) and the browser (loaded by the
// publication editor), the same way post-editor.js and imageCrop.js do.

(function (root) {
    'use strict';

    function toPlainText(input, maxLength) {
    if (typeof input !== 'string') return '';
    return input
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength || 500);
    }

    function stripOuterBraces(value) {
    const trimmed = value.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed.slice(1, -1).trim();
    if (trimmed.startsWith('"') && trimmed.endsWith('"')) return trimmed.slice(1, -1).trim();
    return trimmed;
    }

    /**
     * Split "Smith, Jane and Rao, Amit" (BibTeX's author separator) into names.
     */
    function splitAuthors(raw) {
    return raw
        .split(/\s+and\s+/i)
        .map((name) => toPlainText(name, 150))
        .filter(Boolean);
    }

    /**
     * Parse one BibTeX entry: @article{key, field = {value}, field2 = "value2", ...}
     * Field values may be brace- or quote-delimited; a value with nested braces
     * one level deep is supported (e.g. {A study of {DNA} repair}), but deeper
     * nesting is not.
     */
    function parseBibTeX(text) {
    if (typeof text !== 'string' || !text.trim()) return null;

    const entryMatch = text.match(/@\w+\s*\{[^,]*,([\s\S]*)\}\s*$/);
    const body = entryMatch ? entryMatch[1] : text;

    const fields = {};
    // Matches `name = {value with one level of {nested} braces}` or `name = "value"`.
    const fieldRe = /(\w+)\s*=\s*(\{(?:[^{}]|\{[^{}]*\})*\}|"[^"]*")\s*,?/g;
    let match;
    while ((match = fieldRe.exec(body)) !== null) {
        const key = match[1].toLowerCase();
        fields[key] = stripOuterBraces(match[2]);
    }

    if (!fields.title) return null;

    const result = { title: toPlainText(fields.title, 300) };
    if (fields.author) result.authors = splitAuthors(fields.author);
    if (fields.year) result.year = String(fields.year).trim();
    if (fields.journal) result.journal = toPlainText(fields.journal, 200);
    if (fields.volume) result.volume = toPlainText(fields.volume, 20);
    if (fields.number) result.issue = toPlainText(fields.number, 20);
    if (fields.pages) result.pages = toPlainText(fields.pages, 20).replace(/--/g, '-');
    if (fields.doi) result.doi = toPlainText(fields.doi, 100);
    if (fields.abstract) result.abstract = toPlainText(fields.abstract, 3000);
    if (fields.keywords) {
        result.keywords = fields.keywords.split(/[,;]/).map((k) => toPlainText(k, 60)).filter(Boolean);
    }
    return result;
    }

    /**
     * Parse one RIS record: lines shaped "TA  - value" (a two-letter tag, then
     * "  - ", then the value). AU/KW repeat, one per line.
     */
    function parseRIS(text) {
    if (typeof text !== 'string' || !text.trim()) return null;

    const lineRe = /^([A-Z][A-Z0-9])\s{0,2}-\s?(.*)$/;
    const authors = [];
    const keywords = [];
    const fields = {};

    text.split(/\r?\n/).forEach((line) => {
        const match = line.match(lineRe);
        if (!match) return;
        const tag = match[1];
        const value = match[2].trim();
        if (!value) return;

        if (tag === 'AU' || tag === 'A1') authors.push(toPlainText(value, 150));
        else if (tag === 'KW') keywords.push(toPlainText(value, 60));
        else if (!(tag in fields)) fields[tag] = value; // first occurrence wins for singular tags
    });

    if (!fields.TI && !fields.T1) return null;

    const result = { title: toPlainText(fields.TI || fields.T1, 300) };
    if (authors.length) result.authors = authors;
    if (fields.PY || fields.Y1) result.year = toPlainText(fields.PY || fields.Y1, 4).slice(0, 4);
    if (fields.JO || fields.JF || fields.T2) result.journal = toPlainText(fields.JO || fields.JF || fields.T2, 200);
    if (fields.VL) result.volume = toPlainText(fields.VL, 20);
    if (fields.IS) result.issue = toPlainText(fields.IS, 20);
    if (fields.SP) result.pages = toPlainText(fields.EP ? `${fields.SP}-${fields.EP}` : fields.SP, 20);
    if (fields.DO) result.doi = toPlainText(fields.DO, 100);
    if (fields.AB || fields.N2) result.abstract = toPlainText(fields.AB || fields.N2, 3000);
    if (keywords.length) result.keywords = keywords;
    return result;
    }

    /**
     * Auto-detect and parse either format from pasted text.
     */
    function parseCitation(text) {
    if (typeof text !== 'string') return null;
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (/^TY\s{0,2}-/m.test(trimmed)) return parseRIS(trimmed);
    if (/^@\w+\s*\{/.test(trimmed)) return parseBibTeX(trimmed);
    return null;
    }

    var api = { parseBibTeX: parseBibTeX, parseRIS: parseRIS, parseCitation: parseCitation };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    } else {
        root.PON_importFormats = api;
    }
})(typeof window !== 'undefined' ? window : globalThis);
