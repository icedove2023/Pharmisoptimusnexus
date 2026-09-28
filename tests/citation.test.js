// tests/citation.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCitation } = require('../src/utils/citation');

const journalName = 'Pharmis Optimus Nexus';

test('builds a full citation with authors, volume, issue, pages and DOI', () => {
    const post = { title: 'A Study of Compound X', published_date: '2026-03-15' };
    const details = {
        author_list: [{ name: 'Smith, J.' }, { name: 'Rao, A.' }],
        volume: '12', issue: '3', pages: '45-60', doi: '10.1234/pon.2026.001'
    };
    assert.equal(
        buildCitation({ post, details, journalName }),
        'Smith, J., Rao, A. (2026). A Study of Compound X. Pharmis Optimus Nexus, 12(3), 45-60. https://doi.org/10.1234/pon.2026.001'
    );
});

test('falls back to post.authors when there is no structured author_list', () => {
    const post = { title: 'A Study of Compound X', published_date: '2026-03-15', authors: ['Jane Smith'] };
    const result = buildCitation({ post, details: null, journalName });
    assert.match(result, /^Jane Smith \(2026\)/);
});

test('omits parts that are missing rather than leaving gaps or "undefined"', () => {
    const post = { title: 'A Study of Compound X' };
    const result = buildCitation({ post, details: {}, journalName });
    assert.equal(result, 'A Study of Compound X. Pharmis Optimus Nexus.');
    assert.doesNotMatch(result, /undefined|null/);
});

test('a DOI already given as a full URL is normalized to just the identifier', () => {
    const post = { title: 'X', published_date: '2026-01-01' };
    const details = { doi: 'https://doi.org/10.1234/x' };
    assert.match(buildCitation({ post, details, journalName }), /https:\/\/doi\.org\/10\.1234\/x$/);
});

test('volume with no issue omits the parenthesis', () => {
    const post = { title: 'X', published_date: '2026-01-01' };
    const details = { volume: '5' };
    assert.match(buildCitation({ post, details, journalName }), /Pharmis Optimus Nexus, 5\./);
});

test('returns an empty string when there is no post title', () => {
    assert.equal(buildCitation({ post: null, details: null, journalName }), '');
    assert.equal(buildCitation({ post: {}, details: null, journalName }), '');
});

test('ensures the title always ends with exactly one period', () => {
    const withPeriod = buildCitation({ post: { title: 'Already ends.' }, details: {}, journalName });
    const withoutPeriod = buildCitation({ post: { title: 'No period' }, details: {}, journalName });
    assert.match(withPeriod, /Already ends\. Pharmis/);
    assert.match(withoutPeriod, /No period\. Pharmis/);
});
