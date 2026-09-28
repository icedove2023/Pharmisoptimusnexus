// tests/no-emoji.test.js
// Project rule: no emoji in code or templates. Use the icon helper instead.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SKIP_DIRS = new Set(['node_modules', '.git', 'v1']);
const EXTENSIONS = new Set(['.js', '.ejs', '.css', '.sql', '.json', '.md', '.html']);
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE0F}\u{200D}]/u;

function walk(dir, out = []) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (EXTENSIONS.has(path.extname(entry.name)) && entry.name !== 'package-lock.json') out.push(full);
    }
    return out;
}

test('no emoji in source files', () => {
    const offenders = [];
    for (const file of walk(ROOT)) {
        const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
        lines.forEach((line, i) => {
            if (EMOJI.test(line)) offenders.push(`${path.relative(ROOT, file)}:${i + 1}`);
        });
    }
    assert.deepEqual(offenders, []);
});
