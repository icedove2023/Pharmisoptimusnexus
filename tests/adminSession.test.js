// tests/adminSession.test.js
// Stubs Supabase Auth so sameOriginGuard and adminGuard can be tested without
// a network.
const test = require('node:test');
const assert = require('node:assert/strict');

let getUserImpl = async () => ({ data: { user: null }, error: { message: 'no impl' } });
let refreshImpl = async () => ({ data: null, error: { message: 'no impl' } });

const supabasePath = require.resolve('../src/config/supabase');
require.cache[supabasePath] = {
    id: supabasePath,
    filename: supabasePath,
    loaded: true,
    exports: {
        supabaseAdmin: { auth: { getUser: (token) => getUserImpl(token) } },
        createAuthClient: () => ({ auth: { refreshSession: (args) => refreshImpl(args) } })
    }
};

const { sameOriginGuard, adminGuard } = require('../src/middleware/adminSession');

function mockReq({ method = 'GET', headers = {}, cookies = '' } = {}) {
    return {
        method,
        headers: { cookie: cookies, ...headers },
        get(name) {
            const key = name.toLowerCase();
            if (key === 'cookie') return this.headers.cookie;
            return this.headers[key] || this.headers[name];
        }
    };
}

function mockRes() {
    return {
        statusCode: null,
        body: null,
        redirected: null,
        cookiesCleared: [],
        status(code) { this.statusCode = code; return this; },
        json(body) { this.body = body; return this; },
        send(body) { this.body = body; return this; },
        redirect(code, url) { this.statusCode = code; this.redirected = url; return this; },
        render(view, locals) { this.rendered = view; this.body = locals; return this; },
        clearCookie(name) { this.cookiesCleared.push(name); },
        cookie() {},
        locals: {}
    };
}

async function run(mw, req, res) {
    let nextCalled = false;
    await mw(req, res, () => { nextCalled = true; });
    return nextCalled;
}

// ---- sameOriginGuard ----

test('sameOriginGuard allows GET with no origin', async () => {
    const req = mockReq({ method: 'GET' });
    const res = mockRes();
    assert.equal(await run(sameOriginGuard, req, res), true);
});

test('sameOriginGuard blocks a POST with a mismatched origin', async () => {
    const req = mockReq({ method: 'POST', headers: { origin: 'https://evil.example', host: 'pharmis.example' } });
    const res = mockRes();
    assert.equal(await run(sameOriginGuard, req, res), false);
    assert.equal(res.statusCode, 403);
});

test('sameOriginGuard blocks a POST with no origin or referer', async () => {
    const req = mockReq({ method: 'POST', headers: { host: 'pharmis.example' } });
    const res = mockRes();
    assert.equal(await run(sameOriginGuard, req, res), false);
    assert.equal(res.statusCode, 403);
});

test('sameOriginGuard allows a POST whose origin matches the host', async () => {
    const req = mockReq({ method: 'POST', headers: { origin: 'https://pharmis.example', host: 'pharmis.example' } });
    const res = mockRes();
    assert.equal(await run(sameOriginGuard, req, res), true);
});

// ---- adminGuard ----

const guard = adminGuard({ adminPath: '/studio', isProduction: false, roles: ['admin'] });

test('adminGuard redirects to login when there is no session cookie', async () => {
    const req = mockReq({ cookies: '' });
    const res = mockRes();
    assert.equal(await run(guard, req, res), false);
    assert.equal(res.redirected, '/studio/login');
});

test('adminGuard forbids a signed-in user without the required role', async () => {
    getUserImpl = async () => ({ data: { user: { id: 'u1', email: 'e@example.com', app_metadata: { role: 'editor' } } }, error: null });
    const req = mockReq({ cookies: 'pon_at=good-token' });
    const res = mockRes();
    assert.equal(await run(guard, req, res), false);
    assert.equal(res.statusCode, 403);
});

test('adminGuard allows an admin and attaches req.admin', async () => {
    getUserImpl = async () => ({ data: { user: { id: 'u1', email: 'admin@example.com', app_metadata: { role: 'admin' } } }, error: null });
    const req = mockReq({ cookies: 'pon_at=good-token' });
    const res = mockRes();
    assert.equal(await run(guard, req, res), true);
    assert.deepEqual(req.admin, { id: 'u1', email: 'admin@example.com', role: 'admin' });
});

test('adminGuard refreshes an expired access token using the refresh cookie', async () => {
    getUserImpl = async () => ({ data: { user: null }, error: { message: 'expired' } });
    refreshImpl = async () => ({
        data: { session: { access_token: 'new-token', user: { id: 'u1', email: 'admin@example.com', app_metadata: { role: 'admin' } } } },
        error: null
    });
    const req = mockReq({ cookies: 'pon_at=expired-token; pon_rt=refresh-token' });
    const res = mockRes();
    assert.equal(await run(guard, req, res), true);
    assert.equal(req.admin.role, 'admin');
});

test('adminGuard denies and clears cookies when the refresh token is invalid', async () => {
    getUserImpl = async () => ({ data: { user: null }, error: { message: 'expired' } });
    refreshImpl = async () => ({ data: null, error: { message: 'invalid refresh token' } });
    const req = mockReq({ cookies: 'pon_at=expired-token; pon_rt=bad-refresh-token' });
    const res = mockRes();
    assert.equal(await run(guard, req, res), false);
    assert.equal(res.redirected, '/studio/login');
    assert.ok(res.cookiesCleared.includes('pon_at'));
});

test('adminGuard returns JSON for a fetch request instead of redirecting', async () => {
    const req = mockReq({ cookies: '', headers: { accept: 'application/json' } });
    const res = mockRes();
    assert.equal(await run(guard, req, res), false);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
});
