// tests/snapshotDiff.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { diffSnapshots } = require('../src/utils/snapshotDiff');

test('identical snapshots produce no field differences and no content change', () => {
    const snap = { title: 'Hello', status: 'draft', content: '{"sections":[]}' };
    const result = diffSnapshots(snap, { ...snap });
    assert.deepEqual(result.fields, []);
    assert.equal(result.contentChanged, false);
    assert.equal(result.blockCounts, null);
});

test('detects a change in a single field', () => {
    const result = diffSnapshots({ title: 'Old title' }, { title: 'New title' });
    assert.equal(result.fields.length, 1);
    assert.deepEqual(result.fields[0], { field: 'title', label: 'Title', before: 'Old title', after: 'New title' });
});

test('detects changes across several fields at once', () => {
    const result = diffSnapshots(
        { title: 'A', status: 'draft', category: 'Research' },
        { title: 'A', status: 'published', category: 'Reviews' }
    );
    const fields = result.fields.map((f) => f.field).sort();
    assert.deepEqual(fields, ['category', 'status']);
});

test('trims whitespace before comparing, so no meaningful change is not flagged', () => {
    const result = diffSnapshots({ title: '  Hello  ' }, { title: 'Hello' });
    assert.deepEqual(result.fields, []);
});

test('treats missing and empty-string the same for a field', () => {
    const result = diffSnapshots({}, { title: '' });
    assert.deepEqual(result.fields, []);
});

test('ignores fields not in the known set (no crash on stray keys)', () => {
    const result = diffSnapshots({ mystery: 'a' }, { mystery: 'b' });
    assert.deepEqual(result.fields, []);
});

test('flags content as changed without including the raw block JSON as a field diff', () => {
    const result = diffSnapshots(
        { title: 'A', content: '{"sections":[]}' },
        { title: 'A', content: '{"sections":[{"type":"divider"}]}' }
    );
    assert.deepEqual(result.fields, []); // content is not in FIELD_LABELS
    assert.equal(result.contentChanged, true);
});

test('reports a block count change when content differs', () => {
    const result = diffSnapshots(
        { content: '{"sections":[{"type":"divider"}]}' },
        { content: '{"sections":[{"type":"divider"},{"type":"divider"},{"type":"divider"}]}' }
    );
    assert.deepEqual(result.blockCounts, { before: 1, after: 3 });
});

test('handles invalid JSON in content gracefully (null block counts, still flags changed)', () => {
    const result = diffSnapshots({ content: 'not json' }, { content: '{"sections":[]}' });
    assert.equal(result.contentChanged, true);
    assert.deepEqual(result.blockCounts, { before: null, after: 0 });
});

test('works with publication-specific fields too', () => {
    const result = diffSnapshots({ doi: '10.1/a', keywords: 'x' }, { doi: '10.1/b', keywords: 'x, y' });
    const fields = result.fields.map((f) => f.field).sort();
    assert.deepEqual(fields, ['doi', 'keywords']);
});

test('handles null/undefined snapshots without throwing', () => {
    assert.doesNotThrow(() => diffSnapshots(null, undefined));
    const result = diffSnapshots(null, { title: 'New' });
    assert.equal(result.fields.length, 1);
});
