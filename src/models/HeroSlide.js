// src/models/HeroSlide.js
// The home page hero slideshow. Public reads only see active slides,
// ordered the way the admin arranged them; the admin list sees everything.

const { supabase, supabaseAdmin } = require('../config/supabase');

class HeroSlide {
    static async listActive() {
        const { data, error } = await supabase
            .from('hero_slides')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });
        if (error) {
            console.error('Error in HeroSlide.listActive:', error);
            return [];
        }
        return data || [];
    }

    static async adminList() {
        const { data, error } = await supabaseAdmin
            .from('hero_slides')
            .select('*')
            .order('sort_order', { ascending: true });
        if (error) {
            console.error('Error in HeroSlide.adminList:', error);
            throw error;
        }
        return data || [];
    }

    static async findById(id) {
        const { data, error } = await supabaseAdmin.from('hero_slides').select('*').eq('id', id).maybeSingle();
        if (error) {
            console.error('Error in HeroSlide.findById:', error);
            throw error;
        }
        return data || null;
    }

    static async create(fields) {
        const { data, error } = await supabaseAdmin.from('hero_slides').insert(fields).select().single();
        if (error) {
            console.error('Error in HeroSlide.create:', error);
            throw error;
        }
        return data;
    }

    static async update(id, fields) {
        const { data, error } = await supabaseAdmin.from('hero_slides').update(fields).eq('id', id).select().single();
        if (error) {
            console.error('Error in HeroSlide.update:', error);
            throw error;
        }
        return data;
    }

    static async delete(id) {
        const { error } = await supabaseAdmin.from('hero_slides').delete().eq('id', id);
        if (error) {
            console.error('Error in HeroSlide.delete:', error);
            return false;
        }
        return true;
    }

    /**
     * Persist a new top-to-bottom order after a drag/move in the admin list.
     * `orderedIds` is every slide's id, in the order they should now sort.
     */
    static async reorder(orderedIds) {
        await Promise.all(orderedIds.map((id, index) =>
            supabaseAdmin.from('hero_slides').update({ sort_order: index }).eq('id', id)
        ));
    }
}

module.exports = HeroSlide;
