// tests/publicationForm.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { parsePublicationForm, ARTICLE_TYPES, LICENSES } = require('../src/utils/publicationForm');

test('accepts a fully-filled valid form', () => {
    const result = parsePublicationForm({
        article_type: 'Review Article',
        abstract: 'This review examines recent advances in the field over the last decade.',
        keywords: 'oncology, immunotherapy, clinical trials',
        doi: '10.1234/pon.2026.001',
        volume: '12',
        issue: '3',
        pages: '45-60',
        received_date: '2026-01-10',
        accepted_date: '2026-02-01',
        corresponding_author: 'Dr. Jane Smith',
        license: 'CC BY 4.0',
        pdf_url: '/uploads/paper.pdf',
        author_list: 'Jane Smith | University of Lagos\nAmit Rao | AIIMS Delhi',
        reference_list: 'Smith J. et al. Nature 2024. | https://doi.org/10.1/x\nRao A. Lancet 2023.'
    });
    assert.deepEqual(result.errors, []);
    assert.equal(result.values.article_type, 'Review Article');
    assert.deepEqual(result.values.keywords, ['oncology', 'immunotherapy', 'clinical trials']);
    assert.deepEqual(result.values.author_list, [
        { name: 'Jane Smith', affiliation: 'University of Lagos' },
        { name: 'Amit Rao', affiliation: 'AIIMS Delhi' }
    ]);
    assert.deepEqual(result.values.reference_list, [
        { text: 'Smith J. et al. Nature 2024.', url: 'https://doi.org/10.1/x' },
        { text: 'Rao A. Lancet 2023.' }
    ]);
});

test('defaults article_type and license to the first option when missing or invalid', () => {
    const result = parsePublicationForm({ abstract: 'A short but sufficiently long abstract sentence.' });
    assert.equal(result.values.article_type, ARTICLE_TYPES[0]);
    assert.equal(result.values.license, LICENSES[0]);

    const invalid = parsePublicationForm({ abstract: 'A short but sufficiently long abstract sentence.', article_type: 'Made Up Type', license: 'Whatever' });
    assert.equal(invalid.values.article_type, ARTICLE_TYPES[0]);
    assert.equal(invalid.values.license, LICENSES[0]);
});

test('rejects a missing or too-short abstract', () => {
    assert.ok(parsePublicationForm({}).errors.some((e) => /abstract/i.test(e)));
    assert.ok(parsePublicationForm({ abstract: 'Too short' }).errors.some((e) => /abstract/i.test(e)));
});

test('rejects a malformed received or accepted date', () => {
    const result = parsePublicationForm({
        abstract: 'A sufficiently long abstract sentence for testing purposes.',
        received_date: '01/10/2026'
    });
    assert.ok(result.errors.some((e) => /received/i.test(e)));
    assert.equal(result.values.received_date, null);
});

test('an author line with no affiliation still keeps the name', () => {
    const result = parsePublicationForm({
        abstract: 'A sufficiently long abstract sentence for testing purposes.',
        author_list: 'Jane Smith'
    });
    assert.deepEqual(result.values.author_list, [{ name: 'Jane Smith' }]);
});

test('an author line with no name is dropped', () => {
    const result = parsePublicationForm({
        abstract: 'A sufficiently long abstract sentence for testing purposes.',
        author_list: '| University of Lagos\nJane Smith'
    });
    assert.deepEqual(result.values.author_list, [{ name: 'Jane Smith' }]);
});

test('a reference with an unsafe URL keeps the text but drops the link', () => {
    const result = parsePublicationForm({
        abstract: 'A sufficiently long abstract sentence for testing purposes.',
        reference_list: 'Some citation. | javascript:alert(1)'
    });
    assert.deepEqual(result.values.reference_list, [{ text: 'Some citation.' }]);
});

test('optional identifier fields are null when blank', () => {
    const result = parsePublicationForm({ abstract: 'A sufficiently long abstract sentence for testing purposes.' });
    assert.equal(result.values.doi, null);
    assert.equal(result.values.volume, null);
    assert.equal(result.values.pdf_url, null);
    assert.equal(result.values.corresponding_author, null);
});

test('rejects an unsafe pdf_url', () => {
    const result = parsePublicationForm({
        abstract: 'A sufficiently long abstract sentence for testing purposes.',
        pdf_url: 'javascript:alert(1)'
    });
    assert.ok(result.errors.some((e) => /pdf/i.test(e)));
});

test('caps keywords, authors and references at their maximums', () => {
    const keywords = Array.from({ length: 20 }, (_, i) => `kw${i}`).join(',');
    const authors = Array.from({ length: 40 }, (_, i) => `Author ${i}`).join('\n');
    const refs = Array.from({ length: 400 }, (_, i) => `Ref ${i}`).join('\n');
    const result = parsePublicationForm({
        abstract: 'A sufficiently long abstract sentence for testing purposes.',
        keywords, author_list: authors, reference_list: refs
    });
    assert.equal(result.values.keywords.length, 12);
    assert.equal(result.values.author_list.length, 30);
    assert.equal(result.values.reference_list.length, 300);
});

test('strips tags from free-text fields', () => {
    const result = parsePublicationForm({
        abstract: '<script>bad()</script>A perfectly fine abstract about a study.'
    });
    assert.doesNotMatch(result.values.abstract, /<script/i);
});
