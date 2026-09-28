// src/utils/postForm.js
// Pure validation for the metadata fields on the post editor form (title,
// category, tags, authors, dates, cover image). Content blocks are handled
// separately by utils/contentBlocks.js. Kept dependency-free and side-effect
// free so it can be unit tested without a database.

const { Post } = require('../models');
const { safeMediaUrl } = require('./contentBlocks');
const { toPlainText } = require('./richText');
const { DATE_RE, splitList, todayUtc } = require('./formHelpers');

const MAX_TAGS = 20;
const MAX_AUTHORS = 10;
const DEFAULT_AUTHOR = 'Pharmis Optimus Nexus';

/**
 * Validate and normalize the non-content fields of the post editor form.
 * @returns {{ errors: string[], values: object }}
 */
function parsePostForm(body = {}) {
    const errors = [];
    const values = {};

    const title = toPlainText(body.title, 300);
    if (title.length < 2) errors.push('Title must be at least 2 characters.');
    values.title = title;

    values.excerpt = toPlainText(body.excerpt, 500);

    const category = toPlainText(body.category, 100);
    values.category = category || null;

    values.tags = splitList(body.tags, { maxItems: MAX_TAGS, maxLength: 40 });

    const authors = splitList(body.authors, { maxItems: MAX_AUTHORS, maxLength: 100 });
    values.authors = authors.length ? authors : [DEFAULT_AUTHOR];

    values.featured = body.featured === 'on' || body.featured === true;

    const status = typeof body.status === 'string' ? body.status : 'draft';
    if (!Post.STATUSES.includes(status)) {
        errors.push('Choose a valid status.');
    }
    values.status = Post.STATUSES.includes(status) ? status : 'draft';

    if (values.status === 'scheduled') {
        const scheduledFor = typeof body.scheduled_for === 'string' ? body.scheduled_for.trim() : '';
        const parsed = scheduledFor ? new Date(scheduledFor) : null;
        if (!parsed || Number.isNaN(parsed.getTime())) {
            errors.push('Scheduled posts need a valid date and time.');
            values.scheduled_for = null;
        } else {
            values.scheduled_for = parsed.toISOString();
        }
    } else {
        values.scheduled_for = null;
    }

    const publishedDateRaw = typeof body.published_date === 'string' ? body.published_date.trim() : '';
    if (publishedDateRaw && !DATE_RE.test(publishedDateRaw)) {
        errors.push('Published date must be in YYYY-MM-DD format.');
        values.published_date = null;
    } else if (publishedDateRaw) {
        values.published_date = publishedDateRaw;
    } else if (values.status === 'published') {
        values.published_date = todayUtc();
    } else {
        values.published_date = null;
    }

    const readTime = toPlainText(body.read_time, 30);
    values.read_time = readTime || null; // a null here is filled in by the caller from estimateReadTime()

    const coverInput = typeof body.image_url === 'string' ? body.image_url.trim() : '';
    if (coverInput) {
        const safeUrl = safeMediaUrl(coverInput);
        if (!safeUrl) errors.push('The cover image URL is not valid.');
        values.image_url = safeUrl;
    } else {
        values.image_url = null;
    }

    values.caption = toPlainText(body.caption, 300) || null;

    return { errors, values };
}

module.exports = { parsePostForm, DEFAULT_AUTHOR };
