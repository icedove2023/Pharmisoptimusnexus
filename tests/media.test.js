// tests/media.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { extensionFor, documentExtensionFor, buildStoragePath, MAX_FILE_BYTES, MAX_DOCUMENT_BYTES } = require('../src/utils/media');

test('extensionFor maps known image types and rejects the rest', () => {
    assert.equal(extensionFor('image/jpeg'), 'jpg');
    assert.equal(extensionFor('image/png'), 'png');
    assert.equal(extensionFor('image/webp'), 'webp');
    assert.equal(extensionFor('image/gif'), 'gif');
    assert.equal(extensionFor('image/svg+xml'), null);
    assert.equal(extensionFor('application/pdf'), null);
    assert.equal(extensionFor('text/html'), null);
});

test('buildStoragePath returns null for an unsupported type', () => {
    assert.equal(buildStoragePath('text/plain'), null);
});

test('buildStoragePath never uses caller-supplied input as the file name', () => {
    // The function only ever takes a mimetype, so there is nothing here that
    // could carry a path-traversal or malicious original filename through.
    const path = buildStoragePath('image/png');
    assert.match(path, /^uploads\/\d{4}\/\d{2}\/[0-9a-f]{32}\.png$/);
});

test('buildStoragePath produces a different name each call', () => {
    assert.notEqual(buildStoragePath('image/jpeg'), buildStoragePath('image/jpeg'));
});

test('MAX_FILE_BYTES is a sane, small-ish limit', () => {
    assert.equal(MAX_FILE_BYTES, 8 * 1024 * 1024);
});

test('documentExtensionFor maps PDF and rejects everything else', () => {
    assert.equal(documentExtensionFor('application/pdf'), 'pdf');
    assert.equal(documentExtensionFor('image/png'), null);
    assert.equal(documentExtensionFor('text/plain'), null);
});

test('buildStoragePath supports a custom kind prefix for documents', () => {
    const path = buildStoragePath('application/pdf', { kind: 'documents' });
    assert.match(path, /^documents\/\d{4}\/\d{2}\/[0-9a-f]{32}\.pdf$/);
});

test('MAX_DOCUMENT_BYTES is larger than the image limit', () => {
    assert.equal(MAX_DOCUMENT_BYTES, 20 * 1024 * 1024);
    assert.ok(MAX_DOCUMENT_BYTES > MAX_FILE_BYTES);
});
