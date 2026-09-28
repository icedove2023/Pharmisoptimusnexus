// tests/postForm.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

// parsePostForm only reads Post.STATUSES (a static list) and never touches
// the database, but it requires models/index -> models/Post -> config/supabase,
// so that chain is stubbed the same way the other tests stub it.
const supabasePath = require.resolve('../src/config/supabase');
require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: { supabase: {}, supabaseAdmin: {} }
};

const { parsePostForm, DEFAULT_AUTHOR } = require('../src/utils/postForm');

test('rejects a missing or too-short title', () => {
    assert.ok(parsePostForm({}).errors.some((e) => /title/i.test(e)));
    assert.ok(parsePostForm({ title: 'A' }).errors.some((e) => /title/i.test(e)));
});

test('accepts a normal set of fields with no errors', () => {
    const result = parsePostForm({
        title: 'A New Study on Compound X',
        excerpt: 'A short summary.',
        category: 'Research',
        tags: 'oncology, immunology',
        authors: 'Dr. Jane Smith, Dr. Amit Rao',
        status: 'draft'
    });
    assert.deepEqual(result.errors, []);
    assert.equal(result.values.title, 'A New Study on Compound X');
    assert.deepEqual(result.values.tags, ['oncology', 'immunology']);
    assert.deepEqual(result.values.authors, ['Dr. Jane Smith', 'Dr. Amit Rao']);
});

test('defaults to a single named author when none are given', () => {
    const result = parsePostForm({ title: 'Valid title here' });
    assert.deepEqual(result.values.authors, [DEFAULT_AUTHOR]);
});

test('deduplicates tags case-insensitively and caps the count', () => {
    const tags = Array.from({ length: 30 }, (_, i) => `tag${i % 5}`).join(',');
    const result = parsePostForm({ title: 'Valid title here', tags });
    assert.equal(result.values.tags.length, 5);
});

test('falls back to draft for a missing or invalid status', () => {
    assert.equal(parsePostForm({ title: 'Valid title here' }).values.status, 'draft');
    const result = parsePostForm({ title: 'Valid title here', status: 'deleted-forever' });
    assert.ok(result.errors.some((e) => /status/i.test(e)));
    assert.equal(result.values.status, 'draft');
});

test('a scheduled post requires a valid scheduled_for', () => {
    const missing = parsePostForm({ title: 'Valid title here', status: 'scheduled' });
    assert.ok(missing.errors.some((e) => /scheduled/i.test(e)));

    const bad = parsePostForm({ title: 'Valid title here', status: 'scheduled', scheduled_for: 'not-a-date' });
    assert.ok(bad.errors.some((e) => /scheduled/i.test(e)));

    const good = parsePostForm({ title: 'Valid title here', status: 'scheduled', scheduled_for: '2027-01-15T09:00' });
    assert.deepEqual(good.errors, []);
    assert.ok(good.values.scheduled_for.startsWith('2027-01-15'));
});

test('a published post with no date defaults to today (UTC)', () => {
    const result = parsePostForm({ title: 'Valid title here', status: 'published' });
    const today = new Date().toISOString().slice(0, 10);
    assert.equal(result.values.published_date, today);
});

test('a draft with no date leaves published_date null', () => {
    const result = parsePostForm({ title: 'Valid title here', status: 'draft' });
    assert.equal(result.values.published_date, null);
});

test('rejects a malformed published_date', () => {
    const result = parsePostForm({ title: 'Valid title here', published_date: '15/01/2027' });
    assert.ok(result.errors.some((e) => /date/i.test(e)));
});

test('accepts a same-origin relative cover image path', () => {
    const result = parsePostForm({ title: 'Valid title here', image_url: '/images/cover.jpg' });
    assert.equal(result.values.image_url, '/images/cover.jpg');
});

test('rejects an unsafe cover image URL', () => {
    const result = parsePostForm({ title: 'Valid title here', image_url: 'javascript:alert(1)' });
    assert.ok(result.errors.some((e) => /cover image/i.test(e)));
});

test('an empty cover image field is not an error', () => {
    const result = parsePostForm({ title: 'Valid title here', image_url: '' });
    assert.deepEqual(result.errors, []);
    assert.equal(result.values.image_url, null);
});

test('strips tags from free-text fields', () => {
    const result = parsePostForm({ title: '<b>Bold</b> title here', excerpt: '<script>bad()</script>ok' });
    assert.equal(result.values.title, 'Bold title here');
    assert.equal(result.values.excerpt, 'bad() ok');
});
