// tests/slugify.test.js
// ensureUniqueSlug queries Supabase, so the client is stubbed with a fake
// chainable query builder that records what it was asked and returns
// canned rows.
const test = require('node:test');
const assert = require('node:assert/strict');

let rowsForSlug = {};
let lastQuery = null;

function makeQuery() {
    const state = { table: null, slug: null, excludeId: null };
    const builder = {
        from(table) { state.table = table; return builder; },
        select() { return builder; },
        eq(col, val) { if (col === 'slug') state.slug = val; return builder; },
        neq(col, val) { state.excludeId = { col, val }; return builder; },
        then(resolve) {
            lastQuery = { ...state };
            const rows = (rowsForSlug[state.slug] || []).filter((row) => {
                if (!state.excludeId) return true;
                return row[state.excludeId.col] !== state.excludeId.val;
            });
            return resolve({ data: rows, error: null });
        }
    };
    return builder;
}

const supabasePath = require.resolve('../src/config/supabase');
require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: { supabaseAdmin: { from: (table) => makeQuery().from(table) } }
};

const { generateSlug, ensureUniqueSlug } = require('../src/utils/slugify');

test('generateSlug lowercases, strips punctuation and hyphenates spaces', () => {
    assert.equal(generateSlug('New Drug Trial: Phase II!'), 'new-drug-trial-phase-ii');
});

test('generateSlug collapses repeated separators', () => {
    assert.equal(generateSlug('A   B---C'), 'a-b-c');
});

test('generateSlug returns an empty string for no title', () => {
    assert.equal(generateSlug(''), '');
    assert.equal(generateSlug(undefined), '');
});

test('ensureUniqueSlug returns the base slug when nothing else has it', async () => {
    rowsForSlug = {};
    assert.equal(await ensureUniqueSlug('my-post'), 'my-post');
});

test('ensureUniqueSlug appends -1 when the slug is already taken', async () => {
    rowsForSlug = { 'my-post': [{ id: 'other-id' }] };
    assert.equal(await ensureUniqueSlug('my-post'), 'my-post-1');
});

test('ensureUniqueSlug excludes the post being edited by its own id', async () => {
    // Regression test: this used to filter on the wrong column (google_id),
    // so editing a post without changing its title would falsely detect a
    // collision with itself and append "-1" every time it was saved.
    rowsForSlug = { 'my-post': [{ id: 'post-42' }] };
    assert.equal(await ensureUniqueSlug('my-post', 'post-42'), 'my-post');
    assert.deepEqual(lastQuery.excludeId, { col: 'id', val: 'post-42' });
});

test('ensureUniqueSlug still finds a collision with a different post', async () => {
    rowsForSlug = { 'my-post': [{ id: 'someone-elses-post' }] };
    assert.equal(await ensureUniqueSlug('my-post', 'post-42'), 'my-post-1');
});
