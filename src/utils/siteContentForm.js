// src/utils/siteContentForm.js
// Validation for the hero slide and team member admin forms. Pure and
// dependency-free, following the same pattern as utils/postForm.js.

const { toPlainText } = require('./richText');
const { safeMediaUrl } = require('./contentBlocks');

const TEAM_GROUPS = ['CEC', 'Health and Wellness', 'Media and Publications', 'Community Outreach'];

function parseSlideForm(body = {}) {
    const errors = [];
    const values = {};

    const imageInput = typeof body.image_url === 'string' ? body.image_url.trim() : '';
    const image = safeMediaUrl(imageInput);
    if (!imageInput) {
        errors.push('An image is required.');
    } else if (!image) {
        errors.push('The slide image URL is not valid.');
    }
    values.image_url = image;

    values.headline = toPlainText(body.headline, 150);
    values.subtitle = toPlainText(body.subtitle, 300);
    values.label = toPlainText(body.label, 50) || 'Featured';

    const linkInput = typeof body.link_url === 'string' ? body.link_url.trim() : '';
    if (linkInput) {
        const link = safeMediaUrl(linkInput);
        if (!link) errors.push('The slide link URL is not valid.');
        values.link_url = link;
    } else {
        values.link_url = null;
    }

    values.is_active = body.is_active === 'on' || body.is_active === true;

    return { errors, values };
}

function parseTeamMemberForm(body = {}) {
    const errors = [];
    const values = {};

    values.name = toPlainText(body.name, 150);
    if (values.name.length < 2) {
        errors.push('Name must be at least 2 characters.');
    }

    values.role = toPlainText(body.role, 150) || null;
    values.bio = toPlainText(body.bio, 1000) || null;

    const groupInput = toPlainText(body.team_group, 100);
    values.team_group = TEAM_GROUPS.includes(groupInput) ? groupInput : 'CEC';

    values.is_leader = body.is_leader === 'on' || body.is_leader === true;

    const photoInput = typeof body.photo_url === 'string' ? body.photo_url.trim() : '';
    if (photoInput) {
        const photo = safeMediaUrl(photoInput);
        if (!photo) errors.push('The photo URL is not valid.');
        values.photo_url = photo;
    } else {
        values.photo_url = null;
    }

    values.is_active = body.is_active === 'on' || body.is_active === true;

    return { errors, values };
}

module.exports = { parseSlideForm, parseTeamMemberForm, TEAM_GROUPS };
