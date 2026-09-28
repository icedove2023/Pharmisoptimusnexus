// tests/siteContentForm.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSlideForm, parseTeamMemberForm } = require('../src/utils/siteContentForm');

test('parseSlideForm accepts a valid slide', () => {
    const result = parseSlideForm({
        image_url: '/images/hero1.jpg', headline: 'New Research', subtitle: 'A breakthrough study',
        label: 'Research', link_url: 'https://example.com/x', is_active: 'on'
    });
    assert.deepEqual(result.errors, []);
    assert.equal(result.values.image_url, '/images/hero1.jpg');
    assert.equal(result.values.is_active, true);
});

test('parseSlideForm requires an image', () => {
    assert.ok(parseSlideForm({}).errors.some((e) => /image/i.test(e)));
});

test('parseSlideForm rejects an unsafe image URL', () => {
    const result = parseSlideForm({ image_url: 'javascript:alert(1)' });
    assert.ok(result.errors.some((e) => /image/i.test(e)));
});

test('parseSlideForm defaults label to "Featured" when blank', () => {
    const result = parseSlideForm({ image_url: '/x.jpg' });
    assert.equal(result.values.label, 'Featured');
});

test('parseSlideForm treats a missing link_url as optional (no error)', () => {
    const result = parseSlideForm({ image_url: '/x.jpg' });
    assert.deepEqual(result.errors, []);
    assert.equal(result.values.link_url, null);
});

test('parseSlideForm rejects an unsafe link_url', () => {
    const result = parseSlideForm({ image_url: '/x.jpg', link_url: 'javascript:alert(1)' });
    assert.ok(result.errors.some((e) => /link/i.test(e)));
});

test('parseSlideForm strips tags from text fields', () => {
    const result = parseSlideForm({ image_url: '/x.jpg', headline: '<script>bad()</script>Hello' });
    assert.doesNotMatch(result.values.headline, /<script/i);
});

test('parseSlideForm defaults is_active to false when not checked', () => {
    const result = parseSlideForm({ image_url: '/x.jpg' });
    assert.equal(result.values.is_active, false);
});

test('parseTeamMemberForm accepts a valid member', () => {
    const result = parseTeamMemberForm({
        name: 'Dr. Jane Smith', role: 'Chief Scientific Officer', team_group: 'Health and Wellness',
        photo_url: '/images/jane.jpg', bio: 'Jane leads our research division.', is_active: 'on', is_leader: 'on'
    });
    assert.deepEqual(result.errors, []);
    assert.equal(result.values.name, 'Dr. Jane Smith');
    assert.equal(result.values.team_group, 'Health and Wellness');
    assert.equal(result.values.is_leader, true);
});

test('parseTeamMemberForm rejects a missing or too-short name', () => {
    assert.ok(parseTeamMemberForm({}).errors.some((e) => /name/i.test(e)));
    assert.ok(parseTeamMemberForm({ name: 'A' }).errors.some((e) => /name/i.test(e)));
});

test('parseTeamMemberForm defaults team_group to "CEC" when blank or unrecognized', () => {
    const blank = parseTeamMemberForm({ name: 'Jane Smith' });
    assert.equal(blank.values.team_group, 'CEC');
    const invalid = parseTeamMemberForm({ name: 'Jane Smith', team_group: 'Made Up Team' });
    assert.equal(invalid.values.team_group, 'CEC');
});

test('parseTeamMemberForm defaults is_leader to false when not checked', () => {
    const result = parseTeamMemberForm({ name: 'Jane Smith' });
    assert.equal(result.values.is_leader, false);
});

test('parseTeamMemberForm rejects an unsafe photo URL', () => {
    const result = parseTeamMemberForm({ name: 'Jane Smith', photo_url: 'javascript:alert(1)' });
    assert.ok(result.errors.some((e) => /photo/i.test(e)));
});

test('parseTeamMemberForm allows no photo at all', () => {
    const result = parseTeamMemberForm({ name: 'Jane Smith' });
    assert.deepEqual(result.errors, []);
    assert.equal(result.values.photo_url, null);
});

test('parseTeamMemberForm strips tags from the bio', () => {
    const result = parseTeamMemberForm({ name: 'Jane Smith', bio: '<b>Bold</b> bio text' });
    assert.equal(result.values.bio, 'Bold bio text');
});
