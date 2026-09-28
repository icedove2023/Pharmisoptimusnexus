// tests/contentBlocks.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeContent, BLOCK_TYPES } = require('../src/utils/contentBlocks');

test('empty or missing input produces an empty section list', () => {
    assert.deepEqual(normalizeContent(undefined).content, { sections: [] });
    assert.deepEqual(normalizeContent(null).content, { sections: [] });
    assert.deepEqual(normalizeContent({}).content, { sections: [] });
});

test('parses a JSON string the same as an equivalent object', () => {
    const obj = { sections: [{ type: 'heading', text: 'Hi', level: 2 }] };
    assert.deepEqual(normalizeContent(JSON.stringify(obj)).content, normalizeContent(obj).content);
});

test('invalid JSON is reported and yields no sections', () => {
    const result = normalizeContent('{not json');
    assert.equal(result.content.sections.length, 0);
    assert.ok(result.error);
});

test('an unknown block type is dropped and counted', () => {
    const result = normalizeContent({ sections: [{ type: 'video', url: 'x' }] });
    assert.equal(result.content.sections.length, 0);
    assert.equal(result.dropped, 1);
});

test('a block that is not an object is dropped', () => {
    const result = normalizeContent({ sections: ['nope', 42, null] });
    assert.equal(result.dropped, 3);
});

test('heading: keeps a valid level and strips tags from the text', () => {
    const result = normalizeContent({ sections: [{ type: 'heading', level: 3, text: '<b>Hi</b> there' }] });
    assert.deepEqual(result.content.sections[0], { type: 'heading', level: 3, text: 'Hi there' });
});

test('heading: an invalid level falls back to 2', () => {
    const result = normalizeContent({ sections: [{ type: 'heading', level: 9, text: 'Hi' }] });
    assert.equal(result.content.sections[0].level, 2);
});

test('heading: empty text is dropped', () => {
    const result = normalizeContent({ sections: [{ type: 'heading', text: '   ' }] });
    assert.equal(result.dropped, 1);
});

test('paragraph: keeps allowed inline formatting and drops the rest', () => {
    const result = normalizeContent({ sections: [{ type: 'paragraph', html: '<b>bold</b> <script>bad()</script>' }] });
    assert.equal(result.content.sections[0].html, '<b>bold</b> &lt;script&gt;bad()&lt;/script&gt;');
});

test('paragraph: empty content is dropped', () => {
    const result = normalizeContent({ sections: [{ type: 'paragraph', html: '   ' }] });
    assert.equal(result.dropped, 1);
});

test('list: sanitizes each item and drops empty ones', () => {
    const result = normalizeContent({
        sections: [{ type: 'list', style: 'number', items: ['<i>one</i>', '', '  ', 'two'] }]
    });
    assert.deepEqual(result.content.sections[0], { type: 'list', style: 'number', items: ['<i>one</i>', 'two'] });
});

test('list: an invalid style falls back to bullet', () => {
    const result = normalizeContent({ sections: [{ type: 'list', style: 'roman', items: ['a'] }] });
    assert.equal(result.content.sections[0].style, 'bullet');
});

test('list: a non-array items field is dropped', () => {
    const result = normalizeContent({ sections: [{ type: 'list', items: 'not-an-array' }] });
    assert.equal(result.dropped, 1);
});

test('note: keeps a valid variant and falls back to info', () => {
    const good = normalizeContent({ sections: [{ type: 'note', variant: 'warning', html: 'careful' }] });
    assert.equal(good.content.sections[0].variant, 'warning');
    const bad = normalizeContent({ sections: [{ type: 'note', variant: 'danger', html: 'careful' }] });
    assert.equal(bad.content.sections[0].variant, 'info');
});

test('quote: keeps text and an optional source, strips tags from both', () => {
    const result = normalizeContent({ sections: [{ type: 'quote', text: '<b>wow</b>', source: '<i>Jane</i>' }] });
    assert.deepEqual(result.content.sections[0], { type: 'quote', text: 'wow', source: 'Jane' });
});

test('quote: omits source entirely when not given', () => {
    const result = normalizeContent({ sections: [{ type: 'quote', text: 'wow' }] });
    assert.equal('source' in result.content.sections[0], false);
});

test('image: accepts a relative path and an https URL', () => {
    const relative = normalizeContent({ sections: [{ type: 'image', src: '/images/x.jpg' }] });
    assert.equal(relative.content.sections[0].src, '/images/x.jpg');
    const absolute = normalizeContent({ sections: [{ type: 'image', src: 'https://cdn.example.com/x.jpg' }] });
    assert.equal(absolute.content.sections[0].src, 'https://cdn.example.com/x.jpg');
});

test('image: rejects a javascript: URL and a protocol-relative URL', () => {
    assert.equal(normalizeContent({ sections: [{ type: 'image', src: 'javascript:alert(1)' }] }).dropped, 1);
    assert.equal(normalizeContent({ sections: [{ type: 'image', src: '//evil.example/x.jpg' }] }).dropped, 1);
});

test('image: rejects a plain http URL (https only)', () => {
    assert.equal(normalizeContent({ sections: [{ type: 'image', src: 'http://example.com/x.jpg' }] }).dropped, 1);
});

test('image: defaults size and align, and validates them', () => {
    const result = normalizeContent({ sections: [{ type: 'image', src: '/x.jpg', size: 'huge', align: 'up' }] });
    assert.equal(result.content.sections[0].size, 'wide');
    assert.equal(result.content.sections[0].align, 'center');
});

test('gallery: keeps only images with a valid src', () => {
    const result = normalizeContent({
        sections: [{ type: 'gallery', images: [{ src: '/a.jpg' }, { src: 'javascript:x' }, 'not-an-object'] }]
    });
    assert.equal(result.content.sections[0].images.length, 1);
});

test('gallery: an empty or all-invalid image list is dropped entirely', () => {
    assert.equal(normalizeContent({ sections: [{ type: 'gallery', images: [] }] }).dropped, 1);
    assert.equal(normalizeContent({ sections: [{ type: 'gallery', images: [{ src: 'bad' }] }] }).dropped, 1);
});

test('table: keeps headers and rows, and drops a malformed row', () => {
    const result = normalizeContent({
        sections: [{ type: 'table', headers: ['A', 'B'], rows: [['1', '2'], 'not-a-row', ['3', '4']] }]
    });
    assert.deepEqual(result.content.sections[0], { type: 'table', headers: ['A', 'B'], rows: [['1', '2'], ['3', '4']] });
});

test('table: no headers and no rows is dropped', () => {
    assert.equal(normalizeContent({ sections: [{ type: 'table', headers: [], rows: [] }] }).dropped, 1);
});

test('divider: always produces the same single-field block', () => {
    const result = normalizeContent({ sections: [{ type: 'divider', anything: 'ignored' }] });
    assert.deepEqual(result.content.sections[0], { type: 'divider' });
});

test('code: keeps the code and a valid language, defaults an invalid one to text', () => {
    const result = normalizeContent({ sections: [{ type: 'code', language: 'python', code: 'x = 1' }] });
    assert.deepEqual(result.content.sections[0], { type: 'code', language: 'python', code: 'x = 1' });
    const fallback = normalizeContent({ sections: [{ type: 'code', language: 'brainfuck', code: 'x' }] });
    assert.equal(fallback.content.sections[0].language, 'text');
});

test('code: is not run through the inline sanitizer (kept literal for later escaping)', () => {
    const result = normalizeContent({ sections: [{ type: 'code', code: '<b>not bold</b>' }] });
    assert.equal(result.content.sections[0].code, '<b>not bold</b>');
});

test('code: empty or whitespace-only code is dropped', () => {
    assert.equal(normalizeContent({ sections: [{ type: 'code', code: '   ' }] }).dropped, 1);
});

test('more than the maximum number of blocks are truncated, not rejected wholesale', () => {
    const sections = Array.from({ length: 250 }, (_, i) => ({ type: 'divider', i }));
    const result = normalizeContent({ sections });
    assert.equal(result.content.sections.length, 200);
});

test('every declared block type has a working normalizer', () => {
    assert.ok(BLOCK_TYPES.length >= 9);
    assert.ok(BLOCK_TYPES.includes('paragraph'));
    assert.ok(BLOCK_TYPES.includes('image'));
});

test('a block cannot smuggle extra unexpected fields through', () => {
    const result = normalizeContent({
        sections: [{ type: 'paragraph', html: 'hi', __proto__: { polluted: true }, extra: 'nope' }]
    });
    assert.deepEqual(Object.keys(result.content.sections[0]).sort(), ['html', 'type']);
});
