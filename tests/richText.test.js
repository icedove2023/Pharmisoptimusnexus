// tests/richText.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeInlineHtml, toPlainText } = require('../src/utils/richText');

test('keeps plain text as-is', () => {
    assert.equal(sanitizeInlineHtml('Hello world'), 'Hello world');
});

test('escapes bare angle brackets and ampersands in text', () => {
    assert.equal(sanitizeInlineHtml('A < B & C > D'), 'A &lt; B &amp; C &gt; D');
});

test('allows the basic formatting tags', () => {
    assert.equal(sanitizeInlineHtml('<b>bold</b> <i>italic</i> <em>em</em> <strong>strong</strong>'),
        '<b>bold</b> <i>italic</i> <em>em</em> <strong>strong</strong>');
    assert.equal(sanitizeInlineHtml('<u>under</u> <s>strike</s> <code>x = 1</code>'),
        '<u>under</u> <s>strike</s> <code>x = 1</code>');
});

test('is case-insensitive on tag names but normalizes to lowercase', () => {
    assert.equal(sanitizeInlineHtml('<B>bold</B>'), '<b>bold</b>');
});

test('converts br to a void tag regardless of self-closing style', () => {
    assert.equal(sanitizeInlineHtml('line1<br>line2'), 'line1<br>line2');
    assert.equal(sanitizeInlineHtml('line1<br/>line2'), 'line1<br>line2');
    assert.equal(sanitizeInlineHtml('line1<br />line2'), 'line1<br>line2');
});

test('strips a script tag down to inert escaped text', () => {
    const out = sanitizeInlineHtml('<script>alert(1)</script>');
    assert.doesNotMatch(out, /<script/i);
    assert.match(out, /&lt;script&gt;/);
});

test('strips an img tag (not on the allow list) to escaped text', () => {
    const out = sanitizeInlineHtml('<img src=x onerror=alert(1)>');
    assert.doesNotMatch(out, /<img/i);
});

test('drops attributes and event handlers on an otherwise-allowed tag', () => {
    const out = sanitizeInlineHtml('<b onmouseover="alert(1)">hi</b>');
    assert.equal(out, '<b>hi</b>');
});

test('allows a safe link and forces target and rel', () => {
    const out = sanitizeInlineHtml('<a href="https://example.com">go</a>');
    assert.equal(out, '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">go</a>');
});

test('allows a mailto link', () => {
    const out = sanitizeInlineHtml('<a href="mailto:a@example.com">mail</a>');
    assert.match(out, /^<a href="mailto:a@example\.com"/);
});

test('neutralizes a javascript: link', () => {
    const out = sanitizeInlineHtml('<a href="javascript:alert(1)">go</a>');
    assert.match(out, /^<a href="#"/);
});

test('a well-formed link whose quoted href contains raw angle brackets is still recognized and neutralized', () => {
    const out = sanitizeInlineHtml('<a href="data:text/html,<script>alert(1)</script>">go</a>');
    assert.match(out, /^<a href="#"[^>]*>go<\/a>$/);
});

test('escapes quotes inside an href so the attribute cannot be broken out of', () => {
    const out = sanitizeInlineHtml('<a href=\'https://example.com/"><script>alert(1)</script>\'>go</a>');
    assert.doesNotMatch(out, /<script/i);
});

test('auto-closes tags left open at the end', () => {
    assert.equal(sanitizeInlineHtml('<b>bold'), '<b>bold</b>');
});

test('closing an unopened tag is dropped, not emitted', () => {
    assert.equal(sanitizeInlineHtml('plain</b>text'), 'plaintext');
});

test('nested tags close in the right order even if the input is out of order', () => {
    // Closing <b> first should also close the nested <i> that is still open.
    assert.equal(sanitizeInlineHtml('<b><i>both</b> tail'), '<b><i>both</i></b> tail');
});

test('caps pathological nesting depth instead of pushing indefinitely', () => {
    const deep = '<b>'.repeat(200) + 'x';
    const out = sanitizeInlineHtml(deep);
    const opens = (out.match(/<b>/g) || []).length;
    assert.ok(opens <= 50, `expected at most 50 opened <b> tags, got ${opens}`);
});

test('a stray unmatched angle bracket is escaped, not treated as a tag start', () => {
    assert.equal(sanitizeInlineHtml('5 < 10 and 10 > 5'), '5 &lt; 10 and 10 &gt; 5');
});

test('truncates pathologically long input instead of blowing up in size', () => {
    const huge = '<b>'.repeat(50000) + 'x';
    const out = sanitizeInlineHtml(huge);
    // Every input char can expand at most ~4x when escaped (e.g. '<' -> '&lt;'),
    // and input itself is capped at 20000 chars, so output stays well under
    // 100000 regardless of how large the original 150000-char input was.
    assert.ok(out.length < 100000, `expected bounded output, got ${out.length} chars`);
});

test('toPlainText strips all tags and collapses whitespace', () => {
    assert.equal(toPlainText('<b>Hi</b>   <script>bad()</script>  there'), 'Hi bad() there');
});

test('toPlainText truncates to the given length', () => {
    assert.equal(toPlainText('abcdefgh', 5), 'abcde');
});

test('toPlainText returns an empty string for non-string input', () => {
    assert.equal(toPlainText(undefined), '');
    assert.equal(toPlainText(42), '');
});
