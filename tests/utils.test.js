// tests/utils.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

const { parseCookies } = require('../src/utils/cookies');
const { hmac } = require('../src/utils/privacy');
const { isUuid, isBot } = require('../src/utils/request');

// parseCookies returns a null-prototype object (guards against "__proto__" as
// a cookie name), so compare with a plain-object copy rather than deepEqual.
function plain(obj) {
    return { ...obj };
}

test('parseCookies reads simple pairs', () => {
    assert.deepEqual(plain(parseCookies('a=1; b=2')), { a: '1', b: '2' });
});

test('parseCookies handles missing header and quoted values', () => {
    assert.deepEqual(plain(parseCookies(undefined)), {});
    assert.deepEqual(plain(parseCookies('a="hello world"')), { a: 'hello world' });
});

test('parseCookies keeps the first value when a name repeats', () => {
    assert.deepEqual(plain(parseCookies('a=first; a=second')), { a: 'first' });
});

test('parseCookies is not confused by a __proto__ cookie name', () => {
    const result = parseCookies('__proto__=polluted; safe=1');
    assert.equal(Object.getPrototypeOf({}).polluted, undefined);
    assert.equal(result.safe, '1');
});

test('hmac is deterministic and depends on the secret', () => {
    process.env.SESSION_SECRET = 'test-secret-one';
    const a1 = hmac('visitor-123');
    const a2 = hmac('visitor-123');
    assert.equal(a1, a2);

    process.env.SESSION_SECRET = 'test-secret-two';
    const b = hmac('visitor-123');
    assert.notEqual(a1, b);
});

test('hmac never returns the raw input', () => {
    process.env.SESSION_SECRET = 'test-secret';
    assert.doesNotMatch(hmac('super-secret-visitor-id'), /super-secret-visitor-id/);
});

test('isUuid accepts a real UUID and rejects everything else', () => {
    assert.equal(isUuid('550e8400-e29b-41d4-a716-446655440000'), true);
    assert.equal(isUuid('not-a-uuid'), false);
    assert.equal(isUuid(''), false);
    assert.equal(isUuid(undefined), false);
    assert.equal(isUuid("1'; DROP TABLE posts; --"), false);
});

test('isBot flags missing or known crawler user agents', () => {
    assert.equal(isBot(undefined), true);
    assert.equal(isBot(''), true);
    assert.equal(isBot('Googlebot/2.1'), true);
    assert.equal(isBot('curl/8.0'), true);
    assert.equal(isBot('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120'), false);
});
