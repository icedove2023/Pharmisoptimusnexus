// tests/imageCrop.test.js
// Exercises the pure crop-geometry functions from the browser-only crop
// modal. Guarded behind `typeof module` the same way post-editor.js is, so
// requiring it under Node never touches `document`.
const test = require('node:test');
const assert = require('node:assert/strict');
const { clampBox, applyAspectRatio, defaultBox, computeOutputSize } = require('../src/public/js/imageCrop.js');

test('clampBox leaves a box that already fits untouched', () => {
    assert.deepEqual(clampBox({ x: 10, y: 10, w: 100, h: 50 }, 400, 300), { x: 10, y: 10, w: 100, h: 50 });
});

test('clampBox pulls a box back inside the container on the right/bottom', () => {
    const box = clampBox({ x: 350, y: 280, w: 100, h: 50 }, 400, 300);
    assert.equal(box.x, 300);
    assert.equal(box.y, 250);
    assert.equal(box.w, 100);
    assert.equal(box.h, 50);
});

test('clampBox pulls a box back inside on negative x/y', () => {
    const box = clampBox({ x: -20, y: -5, w: 100, h: 50 }, 400, 300);
    assert.equal(box.x, 0);
    assert.equal(box.y, 0);
});

test('clampBox shrinks a box larger than the container', () => {
    const box = clampBox({ x: 0, y: 0, w: 500, h: 400 }, 400, 300);
    assert.equal(box.w, 400);
    assert.equal(box.h, 300);
});

test('clampBox enforces a minimum size', () => {
    const box = clampBox({ x: 10, y: 10, w: 5, h: 5 }, 400, 300, 20);
    assert.equal(box.w, 20);
    assert.equal(box.h, 20);
});

test('applyAspectRatio with ratio 0 (free-form) just clamps', () => {
    const box = applyAspectRatio({ x: 10, y: 10, w: 100, h: 50 }, 0, 400, 300);
    assert.deepEqual(box, { x: 10, y: 10, w: 100, h: 50 });
});

test('applyAspectRatio produces the requested width/height ratio', () => {
    const box = applyAspectRatio({ x: 50, y: 50, w: 200, h: 80 }, 16 / 9, 400, 300);
    assert.ok(Math.abs(box.w / box.h - 16 / 9) < 0.001);
});

test('applyAspectRatio keeps the box centered on the same point when possible', () => {
    const original = { x: 100, y: 100, w: 100, h: 100 };
    const centerX = original.x + original.w / 2;
    const centerY = original.y + original.h / 2;
    const box = applyAspectRatio(original, 1, 400, 300);
    assert.ok(Math.abs((box.x + box.w / 2) - centerX) < 1);
    assert.ok(Math.abs((box.y + box.h / 2) - centerY) < 1);
});

test('applyAspectRatio never produces a box larger than the container', () => {
    const box = applyAspectRatio({ x: 0, y: 0, w: 390, h: 390 }, 1, 400, 300);
    assert.ok(box.w <= 400);
    assert.ok(box.h <= 300);
    assert.ok(Math.abs(box.w / box.h - 1) < 0.01);
});

test('defaultBox is centered, inset from the edges, and matches the given ratio', () => {
    const box = defaultBox(400, 300, 16 / 9);
    assert.ok(box.x > 0 && box.y > 0);
    assert.ok(box.x + box.w < 400);
    assert.ok(box.y + box.h < 300);
    assert.ok(Math.abs(box.w / box.h - 16 / 9) < 0.01);
});

test('computeOutputSize leaves a small box unscaled', () => {
    assert.deepEqual(computeOutputSize({ w: 800, h: 600 }, 1600), { width: 800, height: 600 });
});

test('computeOutputSize downscales a box larger than maxDim, preserving aspect ratio', () => {
    const out = computeOutputSize({ w: 3200, h: 1600 }, 1600);
    assert.equal(out.width, 1600);
    assert.equal(out.height, 800);
});

test('computeOutputSize never upscales', () => {
    const out = computeOutputSize({ w: 100, h: 50 }, 1600);
    assert.deepEqual(out, { width: 100, height: 50 });
});

test('computeOutputSize always returns at least 1x1', () => {
    const out = computeOutputSize({ w: 0.2, h: 0.1 }, 1600);
    assert.ok(out.width >= 1 && out.height >= 1);
});
