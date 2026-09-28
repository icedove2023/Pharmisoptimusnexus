// tests/importFormats.test.js
// Exercises the pure BibTeX/RIS parsers from the browser-only import panel.
// Guarded behind `typeof module`, same pattern as post-editor.js, so
// requiring it under Node returns just the parser functions without ever
// touching `document`.
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseBibTeX, parseRIS, parseCitation } = require('../src/public/js/importFormats.js');

const BIB = `@article{smith2026study,
  title = {A Study of Compound X},
  author = {Smith, Jane and Rao, Amit},
  journal = {Pharmis Optimus Nexus},
  year = {2026},
  volume = {12},
  number = {3},
  pages = {45--60},
  doi = {10.1234/pon.2026.001},
  abstract = {An abstract about compound X.},
  keywords = {pharmacology, oncology}
}`;

const RIS = `TY  - JOUR
AU  - Smith, Jane
AU  - Rao, Amit
TI  - A Study of Compound X
JO  - Pharmis Optimus Nexus
PY  - 2026
VL  - 12
IS  - 3
SP  - 45
EP  - 60
DO  - 10.1234/pon.2026.001
AB  - An abstract about compound X.
KW  - pharmacology
KW  - oncology
ER  - `;

test('parseBibTeX extracts every field', () => {
    const result = parseBibTeX(BIB);
    assert.equal(result.title, 'A Study of Compound X');
    assert.deepEqual(result.authors, ['Smith, Jane', 'Rao, Amit']);
    assert.equal(result.journal, 'Pharmis Optimus Nexus');
    assert.equal(result.year, '2026');
    assert.equal(result.volume, '12');
    assert.equal(result.issue, '3');
    assert.equal(result.pages, '45-60');
    assert.equal(result.doi, '10.1234/pon.2026.001');
    assert.equal(result.abstract, 'An abstract about compound X.');
    assert.deepEqual(result.keywords, ['pharmacology', 'oncology']);
});

test('parseBibTeX handles quote-delimited values', () => {
    const bib = '@article{k, title = "A Quoted Title", year = "2025"}';
    const result = parseBibTeX(bib);
    assert.equal(result.title, 'A Quoted Title');
    assert.equal(result.year, '2025');
});

test('parseBibTeX handles one level of nested braces in a value', () => {
    const bib = '@article{k, title = {A study of {DNA} repair}}';
    const result = parseBibTeX(bib);
    assert.equal(result.title, 'A study of {DNA} repair');
});

test('parseBibTeX returns null with no title field', () => {
    assert.equal(parseBibTeX('@article{k, year = {2026}}'), null);
});

test('parseBibTeX returns null for empty or non-string input', () => {
    assert.equal(parseBibTeX(''), null);
    assert.equal(parseBibTeX(undefined), null);
});

test('parseBibTeX only includes fields that were actually present', () => {
    const result = parseBibTeX('@article{k, title = {Just a title}}');
    assert.equal(result.title, 'Just a title');
    assert.equal('doi' in result, false);
    assert.equal('authors' in result, false);
});

test('parseBibTeX strips script tags and other markup from text fields', () => {
    const bib = '@article{k, title = {<script>bad()</script>Real Title}}';
    const result = parseBibTeX(bib);
    assert.doesNotMatch(result.title, /<script/i);
});

test('parseRIS extracts every field, including multiple AU and KW lines', () => {
    const result = parseRIS(RIS);
    assert.equal(result.title, 'A Study of Compound X');
    assert.deepEqual(result.authors, ['Smith, Jane', 'Rao, Amit']);
    assert.equal(result.journal, 'Pharmis Optimus Nexus');
    assert.equal(result.year, '2026');
    assert.equal(result.volume, '12');
    assert.equal(result.issue, '3');
    assert.equal(result.pages, '45-60');
    assert.equal(result.doi, '10.1234/pon.2026.001');
    assert.equal(result.abstract, 'An abstract about compound X.');
    assert.deepEqual(result.keywords, ['pharmacology', 'oncology']);
});

test('parseRIS handles SP with no EP (single page, no range)', () => {
    const ris = 'TY  - JOUR\nTI  - X\nSP  - 100\nER  - ';
    const result = parseRIS(ris);
    assert.equal(result.pages, '100');
});

test('parseRIS returns null with no title (TI or T1)', () => {
    assert.equal(parseRIS('TY  - JOUR\nAU  - Smith, Jane\nER  - '), null);
});

test('parseRIS returns null for empty or non-string input', () => {
    assert.equal(parseRIS(''), null);
    assert.equal(parseRIS(null), null);
});

test('parseRIS ignores lines that are not well-formed RIS tags', () => {
    const ris = 'TY  - JOUR\nTI  - X\nnot a tag line\nER  - ';
    const result = parseRIS(ris);
    assert.equal(result.title, 'X');
});

test('parseCitation auto-detects RIS', () => {
    const result = parseCitation(RIS);
    assert.equal(result.title, 'A Study of Compound X');
});

test('parseCitation auto-detects BibTeX', () => {
    const result = parseCitation(BIB);
    assert.equal(result.title, 'A Study of Compound X');
});

test('parseCitation returns null for text that is neither format', () => {
    assert.equal(parseCitation('just some random text, not a citation'), null);
    assert.equal(parseCitation(''), null);
});
