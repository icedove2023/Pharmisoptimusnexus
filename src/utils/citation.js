// src/utils/citation.js
// Builds a plain-text APA-style citation string for a publication, shown in
// the "Cite this article" box and copied to the clipboard from there.
// Pure and dependency-free so it can be unit tested without a database.

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

/**
 * @returns {string} e.g. "Smith, J., Rao, A. (2026). Title of the paper.
 *   Pharmis Optimus Nexus, 12(3), 45-60. https://doi.org/10.1234/x"
 */
function buildCitation({ post, details, journalName }) {
    if (!post || !post.title) return '';

    const authors = authorNames({ details, post });
    const authorsPart = authors.length ? `${authors.join(', ')} ` : '';
    const year = yearOf(post);
    const yearPart = year ? `(${year}). ` : '';
    const title = String(post.title).trim().replace(/\.?$/, '.');

    let volumePart = '';
    if (details && details.volume) {
        volumePart = `, ${details.volume}`;
        if (details.issue) volumePart += `(${details.issue})`;
    }
    const pagesPart = details && details.pages ? `, ${details.pages}` : '';
    const doiPart = details && details.doi ? ` https://doi.org/${String(details.doi).replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')}` : '';

    return `${authorsPart}${yearPart}${title} ${journalName || ''}${volumePart}${pagesPart}.${doiPart}`.replace(/\s+/g, ' ').trim();
}

module.exports = { buildCitation };
