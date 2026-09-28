// src/utils/publicationForm.js
// Validation for the journal-specific fields on the publication editor:
// abstract, structured authors, DOI, volume/issue/pages, dates, corresponding
// author, license and numbered references. The shared post fields (title,
// category, tags, status, dates, cover image) are handled by
// utils/postForm.js - a publication is a post with this extra detail row.

const { toPlainText } = require('./richText');
const { safeMediaUrl } = require('./contentBlocks');
const { splitList, splitLines, DATE_RE } = require('./formHelpers');

const ARTICLE_TYPES = ['Research Article', 'Review Article', 'Case Study', 'Short Communication', 'Editorial'];
const LICENSES = ['CC BY 4.0', 'CC BY-NC 4.0', 'CC BY-NC-ND 4.0', 'All rights reserved'];
const MAX_KEYWORDS = 12;
const MAX_AUTHOR_ENTRIES = 30;
const MAX_REFERENCES = 300;

/**
 * "Jane Smith | University of Lagos" -> { name, affiliation }.
 * A line with no "|" is kept with an empty affiliation rather than dropped,
 * since a name alone is still useful.
 */
function parseAuthorLine(line) {
    const [namePart, ...rest] = line.split('|');
    const name = toPlainText(namePart, 150);
    if (!name) return null;
    const affiliation = toPlainText(rest.join('|'), 200);
    return affiliation ? { name, affiliation } : { name };
}

/**
 * "Citation text | https://doi.org/..." -> { text, url? }. The URL is
 * optional and validated the same way an in-content image URL is
 * (https or relative only - no javascript:/data: schemes).
 */
function parseReferenceLine(line) {
    const [textPart, ...rest] = line.split('|');
    const text = toPlainText(textPart, 500);
    if (!text) return null;
    const urlPart = rest.join('|').trim();
    if (!urlPart) return { text };
    const url = safeMediaUrl(urlPart) || (/^https:\/\//i.test(urlPart) ? urlPart : null);
    return url ? { text, url } : { text };
}

/**
 * @returns {{ errors: string[], values: object }} values match the
 * publication_details table columns directly.
 */
function parsePublicationForm(body = {}) {
    const errors = [];
    const values = {};

    const articleType = toPlainText(body.article_type, 50);
    values.article_type = ARTICLE_TYPES.includes(articleType) ? articleType : ARTICLE_TYPES[0];

    values.abstract = toPlainText(body.abstract, 3000);
    if (values.abstract.length < 20) {
        errors.push('The abstract should be at least a couple of sentences.');
    }

    values.keywords = splitList(body.keywords, { maxItems: MAX_KEYWORDS, maxLength: 60 });

    values.doi = toPlainText(body.doi, 100) || null;
    values.volume = toPlainText(body.volume, 20) || null;
    values.issue = toPlainText(body.issue, 20) || null;
    values.pages = toPlainText(body.pages, 20) || null;

    ['received_date', 'accepted_date'].forEach((field) => {
        const raw = typeof body[field] === 'string' ? body[field].trim() : '';
        if (raw && !DATE_RE.test(raw)) {
            errors.push(`${field === 'received_date' ? 'Received' : 'Accepted'} date must be in YYYY-MM-DD format.`);
            values[field] = null;
        } else {
            values[field] = raw || null;
        }
    });

    values.corresponding_author = toPlainText(body.corresponding_author, 150) || null;

    const license = toPlainText(body.license, 50);
    values.license = LICENSES.includes(license) ? license : LICENSES[0];

    const pdfInput = typeof body.pdf_url === 'string' ? body.pdf_url.trim() : '';
    if (pdfInput) {
        const safeUrl = safeMediaUrl(pdfInput);
        if (!safeUrl) errors.push('The PDF URL is not valid.');
        values.pdf_url = safeUrl;
    } else {
        values.pdf_url = null;
    }

    values.author_list = splitLines(body.author_list, { maxItems: MAX_AUTHOR_ENTRIES, maxLength: 400 })
        .map(parseAuthorLine)
        .filter(Boolean);

    values.reference_list = splitLines(body.reference_list, { maxItems: MAX_REFERENCES, maxLength: 600 })
        .map(parseReferenceLine)
        .filter(Boolean);

    return { errors, values };
}

module.exports = { parsePublicationForm, ARTICLE_TYPES, LICENSES };
