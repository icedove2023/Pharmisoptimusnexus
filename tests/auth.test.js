// tests/auth.test.js
// Run with: npm test
// Stubs the Supabase client so the middleware can be tested without a network.

const test = require('node:test');
const assert = require('node:assert/strict');

let getUserImpl = async () => ({ data: { user: null }, error: { message: 'no impl' } });

const supabasePath = require.resolve('../src/config/supabase');
require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: { supabaseAdmin: { auth: { getUser: (token) => getUserImpl(token) } } }
};

const { requireAdmin, requireEditor } = require('../src/middleware/auth');

function mockReq(headers = {}) {
    return { get: (name) => headers[name.toLowerCase()] };
}

function mockRes() {
    return {
        statusCode: null,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; }
    };
}

async function run(middleware, headers) {
    const req = mockReq(headers);
    const res = mockRes();
    let nextCalled = false;
    await middleware(req, res, () => { nextCalled = true; });
    return { req, res, nextCalled };
}

const userWith = (appMeta, userMeta = {}) => ({
    data: { user: { id: 'u1', email: 'a@example.com', app_metadata: appMeta, user_metadata: userMeta } },
    error: null
});

test('rejects a request with no token', async () => {
    const { res, nextCalled } = await run(requireAdmin, {});
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('rejects a token that Supabase does not accept', async () => {
    getUserImpl = async () => ({ data: { user: null }, error: { message: 'invalid JWT' } });
    const { res, nextCalled } = await run(requireAdmin, { authorization: 'Bearer bad-token' });
    assert.equal(res.statusCode, 401);
    assert.equal(nextCalled, false);
});

test('rejects a signed-in user with no role', async () => {
    getUserImpl = async () => userWith({});
    const { res, nextCalled } = await run(requireAdmin, { authorization: 'Bearer t' });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});

test('ignores a role that only exists in user_metadata', async () => {
    getUserImpl = async () => userWith({}, { role: 'admin' });
    const { res, nextCalled } = await run(requireAdmin, { authorization: 'Bearer t' });
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
});

test('allows an admin and attaches the user', async () => {
    getUserImpl = async () => userWith({ role: 'admin' });
    const { req, res, nextCalled } = await run(requireAdmin, { authorization: 'Bearer t' });
    assert.equal(nextCalled, true);
    assert.equal(res.statusCode, null);
    assert.deepEqual(req.user, { id: 'u1', email: 'a@example.com', role: 'admin' });
});

test('accepts the Bearer scheme case-insensitively', async () => {
    getUserImpl = async () => userWith({ role: 'admin' });
    const { nextCalled } = await run(requireAdmin, { authorization: 'bearer t' });
    assert.equal(nextCalled, true);
});

test('editor is blocked by requireAdmin but allowed by requireEditor', async () => {
    getUserImpl = async () => userWith({ role: 'editor' });
    const blocked = await run(requireAdmin, { authorization: 'Bearer t' });
    assert.equal(blocked.res.statusCode, 403);
    const allowed = await run(requireEditor, { authorization: 'Bearer t' });
    assert.equal(allowed.nextCalled, true);
});

test('returns 503 when the auth lookup throws', async () => {
    getUserImpl = async () => { throw new Error('network down'); };
    const originalError = console.error;
    console.error = () => {};
    const { res, nextCalled } = await run(requireAdmin, { authorization: 'Bearer t' });
    console.error = originalError;
    assert.equal(res.statusCode, 503);
    assert.equal(nextCalled, false);
});
