// tests/postEditorClient.test.js
// Exercises the pure text-conversion functions from the browser-only block
// editor. The file guards its DOM code behind `typeof module`, so requiring
// it under Node returns just { mdLiteToHtml, htmlToMdLite } without ever
// touching `document`.
const test = require('node:test');
const assert = require('node:assert/strict');
const { mdLiteToHtml, htmlToMdLite } = require('../src/public/js/post-editor.js');

test('mdLiteToHtml converts bold, italic, code and links', () => {
    assert.equal(mdLiteToHtml('**bold**'), '<b>bold</b>');
    assert.equal(mdLiteToHtml('*italic*'), '<i>italic</i>');
    assert.equal(mdLiteToHtml('`code`'), '<code>code</code>');
    assert.equal(mdLiteToHtml('[go](https://example.com)'), '<a href="https://example.com">go</a>');
});

test('mdLiteToHtml converts newlines to <br>', () => {
    assert.equal(mdLiteToHtml('line1\nline2'), 'line1<br>line2');
});

test('mdLiteToHtml escapes literal angle brackets before applying markdown', () => {
    assert.equal(mdLiteToHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;');
});

test('mdLiteToHtml only links http(s) and mailto targets, not javascript:', () => {
    // The pattern requires an http(s)/mailto scheme, so a javascript: URL is
    // left as plain (escaped) text rather than becoming a link at all.
    assert.doesNotMatch(mdLiteToHtml('[go](javascript:alert(1))'), /<a /);
});

test('mdLiteToHtml handles plain text with no markdown untouched (aside from escaping)', () => {
    assert.equal(mdLiteToHtml('Just plain text.'), 'Just plain text.');
});

test('htmlToMdLite reverses each conversion', () => {
    assert.equal(htmlToMdLite('<b>bold</b>'), '**bold**');
    assert.equal(htmlToMdLite('<i>italic</i>'), '*italic*');
    assert.equal(htmlToMdLite('<code>code</code>'), '`code`');
    assert.equal(htmlToMdLite('<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">go</a>'), '[go](https://example.com)');
    assert.equal(htmlToMdLite('line1<br>line2'), 'line1\nline2');
});

test('round trip: mdLiteToHtml then htmlToMdLite returns the original for simple cases', () => {
    ['**bold**', '*italic*', '`code`', '[go](https://example.com)', 'line1\nline2', 'plain text'].forEach((original) => {
        assert.equal(htmlToMdLite(mdLiteToHtml(original)), original);
    });
});

test('htmlToMdLite unescapes entities back to literal characters', () => {
    assert.equal(htmlToMdLite('a &lt; b &amp; b &gt; c'), 'a < b & b > c');
});
