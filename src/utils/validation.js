// src/utils/validation.js
const validator = require('validator');

/**
 * Validate email
 */
function validateEmail(email) {
    if (!email) return true; // Email is optional
    return validator.isEmail(email);
}

/**
 * Validate comment content
 */
function validateComment(content) {
    if (!content) return false;
    const trimmed = content.trim();
    return trimmed.length >= 2 && trimmed.length <= 5000;
}

/**
 * Validate author name
 */
function validateAuthor(name) {
    if (!name) return false;
    const trimmed = name.trim();
    return trimmed.length >= 2 && trimmed.length <= 200;
}

/**
 * Sanitize string
 */
function sanitizeString(str) {
    if (!str) return '';
    return str.trim()
        .replace(/[<>]/g, '') // Remove HTML tags
        .slice(0, 5000); // Limit length
}

/**
 * Validate post title
 */
function validateTitle(title) {
    if (!title) return false;
    const trimmed = title.trim();
    return trimmed.length >= 3 && trimmed.length <= 500;
}

/**
 * Validate slug
 */
function validateSlug(slug) {
    if (!slug) return false;
    return /^[a-z0-9-]+$/.test(slug);
}

module.exports = {
    validateEmail,
    validateComment,
    validateAuthor,
    sanitizeString,
    validateTitle,
    validateSlug
};