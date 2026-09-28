// src/controllers/siteContentController.js
// Admin-only management of the home page hero slideshow and the About
// page's team/officials listing (Phase 4). Both are simple ordered lists of
// structured records - no block editor needed, unlike posts.

const config = require('../config');
const HeroSlide = require('../models/HeroSlide');
const TeamMember = require('../models/TeamMember');
const { parseSlideForm, parseTeamMemberForm } = require('../utils/siteContentForm');
const { isUuid } = require('../utils/request');

const adminPath = config.adminPath;

function showError(res, status, message) {
    return res.status(status).render('admin/error', { title: 'Something went wrong', heading: 'Something went wrong', message });
}

// ------------------------------------------------------------
// Hero slides
// ------------------------------------------------------------

exports.getSlides = async (req, res) => {
    try {
        const slides = await HeroSlide.adminList();
        let editing = null;
        if (req.query.edit && isUuid(req.query.edit)) {
            editing = await HeroSlide.findById(req.query.edit);
        }
        res.render('admin/slides', {
            title: 'Slideshow', section: 'slides', slides, errors: [], editing,
            values: editing
        });
    } catch (error) {
        console.error('Admin slides list failed:', error);
        showError(res, 500, 'Slides could not be loaded. Check that migration 009 has been run.');
    }
};

exports.postCreateSlide = async (req, res) => {
    const { errors, values } = parseSlideForm(req.body);
    if (errors.length) {
        const slides = await HeroSlide.adminList().catch(() => []);
        return res.status(400).render('admin/slides', { title: 'Slideshow', section: 'slides', slides, errors, editing: null, values });
    }

    try {
        const existing = await HeroSlide.adminList();
        await HeroSlide.create({ ...values, sort_order: existing.length });
        return res.redirect(303, `${adminPath}/slides`);
    } catch (error) {
        console.error('Admin create slide failed:', error);
        const slides = await HeroSlide.adminList().catch(() => []);
        return res.status(500).render('admin/slides', {
            title: 'Slideshow', section: 'slides', slides,
            errors: ['The slide could not be saved. Check that migration 009 has been run.'], editing: null, values
        });
    }
};

exports.postUpdateSlide = async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) return showError(res, 404, 'That slide could not be found.');

    const { errors, values } = parseSlideForm(req.body);
    if (errors.length) {
        const [slides, editing] = await Promise.all([HeroSlide.adminList().catch(() => []), HeroSlide.findById(id).catch(() => null)]);
        return res.status(400).render('admin/slides', { title: 'Slideshow', section: 'slides', slides, errors, editing, values });
    }

    try {
        await HeroSlide.update(id, values);
        return res.redirect(303, `${adminPath}/slides`);
    } catch (error) {
        console.error('Admin update slide failed:', error);
        return showError(res, 500, 'The slide could not be saved.');
    }
};

exports.postDeleteSlide = async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) return showError(res, 404, 'That slide could not be found.');
    await HeroSlide.delete(id);
    return res.redirect(303, `${adminPath}/slides`);
};

exports.postMoveSlide = async (req, res) => {
    const { id } = req.params;
    const direction = req.body && req.body.direction;
    if (!isUuid(id) || !['up', 'down'].includes(direction)) {
        return res.redirect(303, `${adminPath}/slides`);
    }

    try {
        const slides = await HeroSlide.adminList();
        const index = slides.findIndex((s) => s.id === id);
        const swapWith = direction === 'up' ? index - 1 : index + 1;
        if (index === -1 || swapWith < 0 || swapWith >= slides.length) {
            return res.redirect(303, `${adminPath}/slides`);
        }
        const ids = slides.map((s) => s.id);
        [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
        await HeroSlide.reorder(ids);
    } catch (error) {
        console.error('Admin reorder slides failed:', error);
    }
    return res.redirect(303, `${adminPath}/slides`);
};

// ------------------------------------------------------------
// Team members
// ------------------------------------------------------------

exports.getTeam = async (req, res) => {
    try {
        const members = await TeamMember.adminList();
        let editing = null;
        if (req.query.edit && isUuid(req.query.edit)) {
            editing = await TeamMember.findById(req.query.edit);
        }
        res.render('admin/team', {
            title: 'Team', section: 'team', members, errors: [], editing,
            values: editing
        });
    } catch (error) {
        console.error('Admin team list failed:', error);
        showError(res, 500, 'Team members could not be loaded. Check that migration 009 has been run.');
    }
};

exports.postCreateMember = async (req, res) => {
    const { errors, values } = parseTeamMemberForm(req.body);
    if (errors.length) {
        const members = await TeamMember.adminList().catch(() => []);
        return res.status(400).render('admin/team', { title: 'Team', section: 'team', members, errors, editing: null, values });
    }

    try {
        const existingInGroup = (await TeamMember.adminList()).filter((m) => m.team_group === values.team_group);
        await TeamMember.create({ ...values, sort_order: existingInGroup.length });
        return res.redirect(303, `${adminPath}/team`);
    } catch (error) {
        console.error('Admin create team member failed:', error);
        const members = await TeamMember.adminList().catch(() => []);
        return res.status(500).render('admin/team', {
            title: 'Team', section: 'team', members,
            errors: ['This person could not be saved. Check that migration 009 has been run.'], editing: null, values
        });
    }
};

exports.postUpdateMember = async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) return showError(res, 404, 'That person could not be found.');

    const { errors, values } = parseTeamMemberForm(req.body);
    if (errors.length) {
        const [members, editing] = await Promise.all([TeamMember.adminList().catch(() => []), TeamMember.findById(id).catch(() => null)]);
        return res.status(400).render('admin/team', { title: 'Team', section: 'team', members, errors, editing, values });
    }

    try {
        await TeamMember.update(id, values);
        return res.redirect(303, `${adminPath}/team`);
    } catch (error) {
        console.error('Admin update team member failed:', error);
        return showError(res, 500, 'This person could not be saved.');
    }
};

exports.postDeleteMember = async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) return showError(res, 404, 'That person could not be found.');
    await TeamMember.delete(id);
    return res.redirect(303, `${adminPath}/team`);
};

exports.postMoveMember = async (req, res) => {
    const { id } = req.params;
    const direction = req.body && req.body.direction;
    if (!isUuid(id) || !['up', 'down'].includes(direction)) {
        return res.redirect(303, `${adminPath}/team`);
    }

    try {
        const all = await TeamMember.adminList();
        const member = all.find((m) => m.id === id);
        if (!member) return res.redirect(303, `${adminPath}/team`);

        const group = all.filter((m) => m.team_group === member.team_group);
        const index = group.findIndex((m) => m.id === id);
        const swapWith = direction === 'up' ? index - 1 : index + 1;
        if (swapWith < 0 || swapWith >= group.length) {
            return res.redirect(303, `${adminPath}/team`);
        }
        const ids = group.map((m) => m.id);
        [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
        await TeamMember.reorder(ids);
    } catch (error) {
        console.error('Admin reorder team failed:', error);
    }
    return res.redirect(303, `${adminPath}/team`);
};
