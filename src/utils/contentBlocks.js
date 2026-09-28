// src/utils/contentBlocks.js
// The block-based content format used by both blogs and publications.
// post.content is stored as { sections: [ ...blocks ] }. Every block type
// below is validated and re-built field by field on save - nothing from the
// incoming request is copied through unchecked, so a request that bypasses
// the admin UI cannot smuggle extra fields or oversized content into it.

const { sanitizeInlineHtml, toPlainText } = require('./richText');

const MAX_BLOCKS = 200;
const MAX_LIST_ITEMS = 100;
const MAX_GALLERY_IMAGES = 24;
const MAX_TABLE_ROWS = 100;
const MAX_TABLE_COLS = 20;
const MAX_TITLE_LENGTH = 300;
const MAX_CAPTION_LENGTH = 300;
const MAX_URL_LENGTH = 2000;
const MAX_CODE_LENGTH = 20000;

const HEADING_LEVELS = [2, 3, 4];
const NOTE_VARIANTS = ['info', 'warning', 'success'];
const LIST_STYLES = ['bullet', 'number'];
const IMAGE_SIZES = ['inline', 'wide', 'full'];
const IMAGE_ALIGNS = ['left', 'center', 'right'];
const CODE_LANGUAGES = ['text', 'javascript', 'typescript', 'python', 'bash', 'sql', 'json', 'html', 'css'];

function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

// Same-origin (relative) paths and absolute http(s) URLs. Anything else
// (javascript:, data:, etc.) is rejected outright.
function safeMediaUrl(value) {
    const url = typeof value === 'string' ? value.trim().slice(0, MAX_URL_LENGTH) : '';
    if (!url) return null;
    if (url.startsWith('/') && !url.startsWith('//')) return url;
    if (/^https:\/\/[^\s"'<>]+$/i.test(url)) return url;
    return null;
}

function normalizeHeading(block) {
    const text = toPlainText(block.text, MAX_TITLE_LENGTH);
    if (!text) return null;
    const level = HEADING_LEVELS.includes(Number(block.level)) ? Number(block.level) : 2;
    return { type: 'heading', level, text };
}

function normalizeParagraph(block) {
    const html = sanitizeInlineHtml(typeof block.html === 'string' ? block.html : block.text);
    if (!html.trim()) return null;
    return { type: 'paragraph', html };
}

function normalizeList(block) {
    if (!Array.isArray(block.items)) return null;
    const items = block.items
        .slice(0, MAX_LIST_ITEMS)
        .map((item) => sanitizeInlineHtml(typeof item === 'string' ? item : ''))
        .filter((item) => item.trim());
    if (!items.length) return null;
    const style = LIST_STYLES.includes(block.style) ? block.style : 'bullet';
    return { type: 'list', style, items };
}

function normalizeNote(block) {
    const html = sanitizeInlineHtml(typeof block.html === 'string' ? block.html : block.text);
    if (!html.trim()) return null;
    const variant = NOTE_VARIANTS.includes(block.variant) ? block.variant : 'info';
    return { type: 'note', variant, html };
}

function normalizeQuote(block) {
    const text = toPlainText(block.text, 1000);
    if (!text) return null;
    const source = toPlainText(block.source, 200);
    return { type: 'quote', text, ...(source ? { source } : {}) };
}

function normalizeImage(block) {
    const src = safeMediaUrl(block.src);
    if (!src) return null;
    const alt = toPlainText(block.alt, MAX_CAPTION_LENGTH);
    const caption = toPlainText(block.caption, MAX_CAPTION_LENGTH);
    const size = IMAGE_SIZES.includes(block.size) ? block.size : 'wide';
    const align = IMAGE_ALIGNS.includes(block.align) ? block.align : 'center';
    return { type: 'image', src, alt, caption, size, align };
}

function normalizeGallery(block) {
    if (!Array.isArray(block.images)) return null;
    const images = block.images
        .slice(0, MAX_GALLERY_IMAGES)
        .map((img) => {
            if (!isPlainObject(img)) return null;
            const src = safeMediaUrl(img.src);
            if (!src) return null;
            return { src, alt: toPlainText(img.alt, MAX_CAPTION_LENGTH), caption: toPlainText(img.caption, MAX_CAPTION_LENGTH) };
        })
        .filter(Boolean);
    if (!images.length) return null;
    return { type: 'gallery', images };
}

function normalizeTable(block) {
    const headers = Array.isArray(block.headers)
        ? block.headers.slice(0, MAX_TABLE_COLS).map((h) => toPlainText(h, 200))
        : [];
    const rows = Array.isArray(block.rows)
        ? block.rows
              .slice(0, MAX_TABLE_ROWS)
              .filter((row) => Array.isArray(row))
              .map((row) => row.slice(0, MAX_TABLE_COLS).map((cell) => toPlainText(cell, 500)))
        : [];
    if (!headers.length && !rows.length) return null;
    return { type: 'table', headers, rows };
}

function normalizeDivider() {
    return { type: 'divider' };
}

/**
 * Rough reading time from a normalized section list, used when the admin
 * leaves the read-time field blank. Counts words in every text-bearing
 * block at 200 words per minute, rounded up to the nearest minute.
 */
function estimateReadTime(sections) {
    if (!Array.isArray(sections) || !sections.length) return '1 min read';

    const wordsIn = (text) => (typeof text === 'string' ? text.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length : 0);

    let words = 0;
    sections.forEach((block) => {
        if (!isPlainObject(block)) return;
        switch (block.type) {
            case 'heading':
            case 'quote':
                words += wordsIn(block.text);
                break;
            case 'paragraph':
            case 'note':
                words += wordsIn(block.html);
                break;
            case 'list':
                (block.items || []).forEach((item) => { words += wordsIn(item); });
                break;
            case 'code':
                words += Math.ceil(wordsIn(block.code) / 3); // code reads slower per token, but isn't prose
                break;
            default:
                break;
        }
    });

    const minutes = Math.max(1, Math.round(words / 200));
    return `${minutes} min read`;
}

function normalizeCode(block) {
    const code = typeof block.code === 'string' ? block.code.slice(0, MAX_CODE_LENGTH) : '';
    if (!code.trim()) return null;
    const language = CODE_LANGUAGES.includes(block.language) ? block.language : 'text';
    return { type: 'code', language, code };
}

const NORMALIZERS = {
    heading: normalizeHeading,
    paragraph: normalizeParagraph,
    list: normalizeList,
    note: normalizeNote,
    quote: normalizeQuote,
    image: normalizeImage,
    gallery: normalizeGallery,
    table: normalizeTable,
    divider: normalizeDivider,
    code: normalizeCode
};

/**
 * Validate and rebuild a content payload from the admin editor.
 * Accepts a JS object or a JSON string. Unknown block types, and blocks
 * missing what they need, are dropped rather than failing the whole save -
 * `dropped` tells the caller how many were removed so it can warn the admin.
 *
 * @returns {{ content: { sections: object[] }, dropped: number }}
 */
function normalizeContent(input) {
    let raw = input;
    if (typeof raw === 'string') {
        try {
            raw = raw.trim() ? JSON.parse(raw) : {};
        } catch (err) {
            return { content: { sections: [] }, dropped: 0, error: 'Content was not valid JSON' };
        }
    }
    if (!isPlainObject(raw)) raw = {};

    const sectionsIn = Array.isArray(raw.sections) ? raw.sections.slice(0, MAX_BLOCKS) : [];
    const sections = [];
    let dropped = 0;

    sectionsIn.forEach((block) => {
        if (!isPlainObject(block) || typeof block.type !== 'string') {
            dropped += 1;
            return;
        }
        const normalize = NORMALIZERS[block.type];
        const result = normalize ? normalize(block) : null;
        if (result) sections.push(result);
        else dropped += 1;
    });

    return { content: { sections }, dropped };
}

module.exports = {
    normalizeContent,
    safeMediaUrl,
    estimateReadTime,
    BLOCK_TYPES: Object.keys(NORMALIZERS),
    HEADING_LEVELS,
    NOTE_VARIANTS,
    LIST_STYLES,
    IMAGE_SIZES,
    IMAGE_ALIGNS,
    CODE_LANGUAGES
};
