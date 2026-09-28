// tests/exportFormats.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { toBibTeX, toRIS, citationKey } = require('../src/utils/exportFormats');

const journalName = 'Pharmis Optimus Nexus';
const post = { title: 'A Study of Compound X', published_date: '2026-03-15' };
const details = {
    author_list: [{ name: 'Smith, Jane' }, { name: 'Rao, Amit' }],
    volume: '12', issue: '3', pages: '45-60', doi: 'https://doi.org/10.1234/pon.2026.001',
    abstract: 'An abstract about compound X.', keywords: ['pharmacology', 'oncology']
};
const url = 'https://pharmisoptimusnexus.example/publications/a-study-of-compound-x';

test('citationKey combines surname, year and a title fragment', () => {
    assert.equal(citationKey({ post, details }), 'smith2026astudyof');
});

test('citationKey falls back gracefully with no authors, year or title', () => {
    assert.equal(citationKey({ post: {}, details: null }), 'ponnd');
});

test('toBibTeX produces a well-formed @article entry with every field', () => {
    const bib = toBibTeX({ post, details, journalName, url });
    assert.match(bib, /^@article\{smith2026astudyof,/);
    assert.match(bib, /title = \{A Study of Compound X\}/);
    assert.match(bib, /author = \{Smith, Jane and Rao, Amit\}/);
    assert.match(bib, /journal = \{Pharmis Optimus Nexus\}/);
    assert.match(bib, /year = \{2026\}/);
    assert.match(bib, /volume = \{12\}/);
    assert.match(bib, /number = \{3\}/);
    assert.match(bib, /pages = \{45-60\}/);
    assert.match(bib, /doi = \{10\.1234\/pon\.2026\.001\}/);
    assert.match(bib, /url = \{https:\/\/pharmisoptimusnexus\.example/);
    assert.match(bib, /\}\n?$/);
});

test('toBibTeX omits optional fields that are missing', () => {
    const bib = toBibTeX({ post: { title: 'X' }, details: null, journalName });
    assert.doesNotMatch(bib, /author =/);
    assert.doesNotMatch(bib, /doi =/);
});

test('toBibTeX strips braces from field values so the entry cannot be broken', () => {
    const bib = toBibTeX({ post: { title: 'A {malicious} title' }, details: null, journalName });
    assert.doesNotMatch(bib, /\{malicious\}/);
    assert.match(bib, /title = \{A malicious title\}/);
});

test('toBibTeX returns an empty string with no post title', () => {
    assert.equal(toBibTeX({ post: null, details: null, journalName }), '');
});

test('toRIS starts with TY - JOUR and ends with ER', () => {
    const ris = toRIS({ post, details, journalName, url });
    assert.match(ris, /^TY  - JOUR/);
    assert.match(ris, /ER  - \s*$/);
});

test('toRIS includes one AU line per author, title, journal and year', () => {
    const ris = toRIS({ post, details, journalName, url });
    assert.equal((ris.match(/^AU  - /gm) || []).length, 2);
    assert.match(ris, /AU  - Smith, Jane/);
    assert.match(ris, /AU  - Rao, Amit/);
    assert.match(ris, /TI  - A Study of Compound X/);
    assert.match(ris, /JO  - Pharmis Optimus Nexus/);
    assert.match(ris, /PY  - 2026/);
});

test('toRIS splits a page range into SP and EP', () => {
    const ris = toRIS({ post, details, journalName });
    assert.match(ris, /SP  - 45/);
    assert.match(ris, /EP  - 60/);
});

test('toRIS includes one KW line per keyword', () => {
    const ris = toRIS({ post, details, journalName });
    assert.equal((ris.match(/^KW  - /gm) || []).length, 2);
});

test('toRIS flattens a field containing a newline to a single line', () => {
    const ris = toRIS({ post: { title: 'X' }, details: { abstract: 'Line one\nLine two' }, journalName });
    assert.match(ris, /^AB  - Line one Line two$/m);
});

test('toRIS returns an empty string with no post title', () => {
    assert.equal(toRIS({ post: {}, details: null, journalName }), '');
});
