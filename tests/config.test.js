// tests/config.test.js
// The config module reads process.env at require time, so each case reloads
// it fresh. dotenv is stubbed out since there is no .env file in the test run.
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const originalLoad = Module._load;
Module._load = function (request, ...rest) {
    if (request === 'dotenv') return { config() {} };
    return originalLoad.call(this, request, ...rest);
};

const configPath = require.resolve('../src/config');

function loadConfigWith(adminPath) {
    delete require.cache[configPath];
    if (adminPath === undefined) delete process.env.ADMIN_PATH;
    else process.env.ADMIN_PATH = adminPath;
    const originalWarn = console.warn;
    console.warn = () => {};
    const result = require('../src/config');
    console.warn = originalWarn;
    return result;
}

test('defaults to /studio when ADMIN_PATH is not set', () => {
    assert.equal(loadConfigWith(undefined).adminPath, '/studio');
});

test('normalizes a value with no leading slash and a trailing slash', () => {
    assert.equal(loadConfigWith('Team-Portal/').adminPath, '/team-portal');
});

test('falls back to /studio for a reserved path', () => {
    assert.equal(loadConfigWith('/api').adminPath, '/studio');
    assert.equal(loadConfigWith('/blog').adminPath, '/studio');
    assert.equal(loadConfigWith('/publications').adminPath, '/studio');
    assert.equal(loadConfigWith('/teams').adminPath, '/studio');
});

test('falls back to /studio for an invalid path', () => {
    assert.equal(loadConfigWith('bad path').adminPath, '/studio');
});

test('accepts a valid custom path', () => {
    assert.equal(loadConfigWith('/a/b-c').adminPath, '/a/b-c');
});

test.after(() => {
    Module._load = originalLoad;
    delete require.cache[configPath];
});
