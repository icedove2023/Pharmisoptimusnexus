const assert = require('node:assert/strict');
const { clampBox, applyAspectRatio, defaultBox, computeOutputSize } = require('./src/public/js/imageCrop.js');
const { extensionFor, documentExtensionFor, buildStoragePath, MAX_FILE_BYTES, MAX_DOCUMENT_BYTES } = require('./src/utils/media.js');

assert.deepEqual(clampBox({ x: 10, y: 10, w: 100, h: 50 }, 400, 300), { x: 10, y: 10, w: 100, h: 50 });
assert.equal(clampBox({ x: 350, y: 280, w: 100, h: 50 }, 400, 300).x, 300);
assert.equal(extensionFor('image/jpeg'), 'jpg');
assert.equal(extensionFor('image/png'), 'png');
assert.equal(documentExtensionFor('application/pdf'), 'pdf');
assert.equal(MAX_FILE_BYTES, 8 * 1024 * 1024);
assert.equal(MAX_DOCUMENT_BYTES, 20 * 1024 * 1024);
const p = buildStoragePath('image/png');
assert.ok(/^uploads\/[0-9]{4}\/[0-9]{2}\/[0-9a-f]{32}\.png$/.test(p));
assert.ok(Math.abs(applyAspectRatio({ x: 50, y: 50, w: 200, h: 80 }, 16 / 9, 400, 300).w / applyAspectRatio({ x: 50, y: 50, w: 200, h: 80 }, 16 / 9, 400, 300).h - 16 / 9) < 0.01);
assert.ok(defaultBox(400, 300, 16 / 9).w > 0);
assert.deepEqual(computeOutputSize({ w: 3200, h: 1600 }, 1600), { width: 1600, height: 800 });
console.log('media and crop assertions passed');
