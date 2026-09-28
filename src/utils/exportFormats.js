// src/utils/exportFormats.js
// BibTeX and RIS export for a publication. Pure and dependency-free, mirrors
// src/utils/citation.js. Field escaping follows each format's own minimal
// rules (BibTeX braces, RIS one-tag-per-line), not a general-purpose one.

function authorNames({ details, post }) {
    if (details && Array.isArray(details.author_list) && details.author_list.length) {
        return details.author_list.map((a) => a.name).filter(Boolean);
    }
    if (Array.isArray(post && post.authors) && post.authors.length) {
        return post.authors;
    }
    return [];
}

function yearOf(post) {
    const raw = post && post.published_date;
    const date = raw ? new Date(raw) : null;
    return date && !Number.isNaN(date.getTime()) ? date.getFullYear() : null;
}

function normalizedDoi(doi) {
    return doi ? String(doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '') : null;
}

/**
 * A short, stable citation key: first author's surname + year + a slug
 * fragment of the title, e.g. "smith2026aStudyOf".
 */
function citationKey({ post, details }) {
    const authors = authorNames({ details, post });
    const surname = authors.length ? String(authors[0]).split(/[\s,]+/)[0].toLowerCase().replace(/[^a-z]/g, '') : 'pon';
    const year = yearOf(post) || 'nd';
    const titleFragment = String((post && post.title) || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .join('');
    return `${surname}${year}${titleFragment}`.slice(0, 60) || 'pon-reference';
}

function escapeBibTeX(value) {
    return String(value == null ? '' : value).replace(/[{}]/g, '');
}

/**
 * @returns {string} a single BibTeX @article entry.
 */
function toBibTeX({ post, details, journalName, url }) {
    if (!post || !post.title) return '';

    const authors = authorNames({ details, post });
    const lines = [`@article{${citationKey({ post, details })},`];
    lines.push(`  title = {${escapeBibTeX(post.title)}},`);
    if (authors.length) lines.push(`  author = {${escapeBibTeX(authors.join(' and '))}},`);
    lines.push(`  journal = {${escapeBibTeX(journalName)}},`);
    const year = yearOf(post);
    if (year) lines.push(`  year = {${year}},`);
    if (details && details.volume) lines.push(`  volume = {${escapeBibTeX(details.volume)}},`);
    if (details && details.issue) lines.push(`  number = {${escapeBibTeX(details.issue)}},`);
    if (details && details.pages) lines.push(`  pages = {${escapeBibTeX(details.pages)}},`);
    const doi = normalizedDoi(details && details.doi);
    if (doi) lines.push(`  doi = {${escapeBibTeX(doi)}},`);
    if (url) lines.push(`  url = {${escapeBibTeX(url)}},`);
    lines.push('}');
    return lines.join('\n');
}

/**
 * @returns {string} an RIS record (TY/AU/TI/... one tag per line, ending ER).
 * RIS has no escaping mechanism; a newline in a field is simply not
 * possible to represent, so values are flattened to a single line.
 */
function toRIS({ post, details, journalName, url }) {
    if (!post || !post.title) return '';

    const flatten = (v) => String(v == null ? '' : v).replace(/[\r\n]+/g, ' ').trim();
    const authors = authorNames({ details, post });
    const lines = ['TY  - JOUR'];
    authors.forEach((name) => lines.push(`AU  - ${flatten(name)}`));
    lines.push(`TI  - ${flatten(post.title)}`);
    lines.push(`JO  - ${flatten(journalName)}`);
    const year = yearOf(post);
    if (year) lines.push(`PY  - ${year}`);
    if (details && details.volume) lines.push(`VL  - ${flatten(details.volume)}`);
    if (details && details.issue) lines.push(`IS  - ${flatten(details.issue)}`);
    if (details && details.pages) {
        const [start, end] = String(details.pages).split(/[-\u2013]/);
        if (start) lines.push(`SP  - ${flatten(start)}`);
        if (end) lines.push(`EP  - ${flatten(end)}`);
    }
    const doi = normalizedDoi(details && details.doi);
    if (doi) lines.push(`DO  - ${flatten(doi)}`);
    if (details && details.abstract) lines.push(`AB  - ${flatten(details.abstract)}`);
    (details && details.keywords ? details.keywords : []).forEach((kw) => lines.push(`KW  - ${flatten(kw)}`));
    if (url) lines.push(`UR  - ${flatten(url)}`);
    lines.push('ER  - ');
    return lines.join('\n');
}

module.exports = { toBibTeX, toRIS, citationKey };
