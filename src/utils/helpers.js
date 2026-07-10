// src/utils/helpers.js
const { baseUrl } = require('../config');

/**
 * Format date
 */
function formatDate(date, format = 'MMMM D, YYYY') {
    if (!date) return '';
    const d = new Date(date);
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const replacements = {
        'MMMM': months[d.getMonth()],
        'MMM': monthNames[d.getMonth()],
        'MM': String(d.getMonth() + 1).padStart(2, '0'),
        'M': d.getMonth() + 1,
        'DD': String(d.getDate()).padStart(2, '0'),
        'D': d.getDate(),
        'YYYY': d.getFullYear(),
        'YY': String(d.getFullYear()).slice(-2)
    };
    
    let result = format;
    for (const [key, value] of Object.entries(replacements)) {
        result = result.replace(key, value);
    }
    
    return result;
}

/**
 * Truncate text
 */
function truncate(text, length = 150, suffix = '...') {
    if (!text) return '';
    if (text.length <= length) return text;
    return text.substring(0, length).trim() + suffix;
}

/**
 * Generate meta description
 */
function generateMetaDescription(post) {
    if (post.excerpt) {
        return truncate(post.excerpt, 160);
    }
    if (post.content && post.content.sections) {
        const firstParagraph = post.content.sections.find(s => s.type === 'paragraph');
        if (firstParagraph) {
            return truncate(firstParagraph.text, 160);
        }
    }
    return 'Read this article on Pharmis Optimus Nexus';
}

/**
 * Build full URL
 */
function buildUrl(path) {
    return `${baseUrl}${path.startsWith('/') ? path : '/' + path}`;
}

/**
 * Convert to JSON safe
 */
function toJSON(data) {
    return JSON.parse(JSON.stringify(data));
}

module.exports = {
    formatDate,
    truncate,
    generateMetaDescription,
    buildUrl,
    toJSON
};