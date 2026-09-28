// src/models/TeamMember.js
// Officials shown on the About page, grouped by team_group (e.g.
// "Leadership", "Advisory Board"). Public reads only see active members.

const { supabase, supabaseAdmin } = require('../config/supabase');

const TEAM_GROUPS = ['CEC', 'Health and Wellness', 'Media and Publications', 'Community Outreach'];

class TeamMember {
    static async listActive() {
        const { data, error } = await supabase
            .from('team_members')
            .select('*')
            .eq('is_active', true)
            .order('team_group', { ascending: true })
            .order('sort_order', { ascending: true });
        if (error) {
            console.error('Error in TeamMember.listActive:', error);
            return [];
        }
        return data || [];
    }

    /**
     * Every active member of one team (or CEC), for that team's own public
     * page. Leaders first, then everyone else, each in their saved order.
     */
    static async listByGroup(group) {
        const { data, error } = await supabase
            .from('team_members')
            .select('*')
            .eq('is_active', true)
            .eq('team_group', group)
            .order('is_leader', { ascending: false })
            .order('sort_order', { ascending: true });
        if (error) {
            console.error('Error in TeamMember.listByGroup:', error);
            return [];
        }
        return data || [];
    }

    /**
     * Each team's leadership, for the About page: one entry per group in the
     * organization's fixed order (CEC first, then the three teams), each
     * holding only that group's is_leader members. A group with no leaders
     * yet is included with an empty members array so the About page can
     * still render its heading and "meet the team" link.
     */
    static async listLeadersGrouped() {
        const { data, error } = await supabase
            .from('team_members')
            .select('*')
            .eq('is_active', true)
            .eq('is_leader', true)
            .order('sort_order', { ascending: true });
        if (error) {
            console.error('Error in TeamMember.listLeadersGrouped:', error);
            return TEAM_GROUPS.map((group) => ({ group, members: [] }));
        }

        const members = data || [];
        return TEAM_GROUPS.map((group) => ({
            group,
            members: members.filter((m) => m.team_group === group)
        }));
    }

    /**
     * Active members grouped for display: [{ group, members: [...] }],
     * groups in the order they first appear (already sorted by team_group).
     * Kept for callers that want every active member rather than just
     * leaders - listLeadersGrouped() is what the About page uses.
     */
    static async listActiveGrouped() {
        const members = await TeamMember.listActive();
        const groups = [];
        const byName = new Map();
        members.forEach((member) => {
            const key = member.team_group || 'Team';
            if (!byName.has(key)) {
                byName.set(key, { group: key, members: [] });
                groups.push(byName.get(key));
            }
            byName.get(key).members.push(member);
        });
        return groups;
    }

    static async adminList() {
        const { data, error } = await supabaseAdmin
            .from('team_members')
            .select('*')
            .order('team_group', { ascending: true })
            .order('sort_order', { ascending: true });
        if (error) {
            console.error('Error in TeamMember.adminList:', error);
            throw error;
        }
        return data || [];
    }

    static async findById(id) {
        const { data, error } = await supabaseAdmin.from('team_members').select('*').eq('id', id).maybeSingle();
        if (error) {
            console.error('Error in TeamMember.findById:', error);
            throw error;
        }
        return data || null;
    }

    static async create(fields) {
        const { data, error } = await supabaseAdmin.from('team_members').insert(fields).select().single();
        if (error) {
            console.error('Error in TeamMember.create:', error);
            throw error;
        }
        return data;
    }

    static async update(id, fields) {
        const { data, error } = await supabaseAdmin.from('team_members').update(fields).eq('id', id).select().single();
        if (error) {
            console.error('Error in TeamMember.update:', error);
            throw error;
        }
        return data;
    }

    static async delete(id) {
        const { error } = await supabaseAdmin.from('team_members').delete().eq('id', id);
        if (error) {
            console.error('Error in TeamMember.delete:', error);
            return false;
        }
        return true;
    }

    static async reorder(orderedIds) {
        await Promise.all(orderedIds.map((id, index) =>
            supabaseAdmin.from('team_members').update({ sort_order: index }).eq('id', id)
        ));
    }
}

module.exports = TeamMember;
module.exports.TEAM_GROUPS = TEAM_GROUPS;
