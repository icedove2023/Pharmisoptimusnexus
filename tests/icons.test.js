// tests/icons.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { icon, ICON_NAMES } = require('../src/utils/icons');

test('every icon renders a decorative inline svg', () => {
    for (const name of ICON_NAMES) {
        const svg = icon(name);
        assert.match(svg, /^<svg class="icon-svg"/, name);
        assert.match(svg, /aria-hidden="true"/, name);
        assert.match(svg, /<\/svg>$/, name);
    }
});

test('an unknown icon returns an empty string instead of throwing', () => {
    const originalWarn = console.warn;
    console.warn = () => {};
    assert.equal(icon('does-not-exist'), '');
    console.warn = originalWarn;
});

test('extra classes are appended', () => {
    assert.match(icon('heart', { class: 'is-large' }), /class="icon-svg is-large"/);
});
