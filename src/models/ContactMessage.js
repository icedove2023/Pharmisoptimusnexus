// src/models/ContactMessage.js
// Contact form inbox. Only the server (service role) can read or write it.

const { supabaseAdmin } = require('../config/supabase');

const STATUSES = ['new', 'read', 'archived'];

class ContactMessage {
    static async create({ name, email, subject = null, message, ipHash = null, userAgent = null }) {
        const { data, error } = await supabaseAdmin
            .from('contact_messages')
            .insert({
                name,
                email,
                subject,
                message,
                ip_hash: ipHash,
                user_agent: userAgent ? String(userAgent).slice(0, 300) : null
            })
            .select('id')
            .single();
        if (error) throw error;
        return data;
    }

    static async list({ status = null, page = 1, limit = 20 } = {}) {
        if (status && !STATUSES.includes(status)) {
            throw new Error(`Invalid message status: ${status}`);
        }
        const safePage = Math.max(parseInt(page, 10) || 1, 1);

        let query = supabaseAdmin.from('contact_messages').select('*', { count: 'exact' });
        if (status) query = query.eq('status', status);

        const offset = (safePage - 1) * limit;
        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        if (error) throw error;

        const total = count || 0;
        return {
            messages: data || [],
            total,
            page: safePage,
            limit,
            totalPages: Math.max(Math.ceil(total / limit), 1)
        };
    }

    static async setStatus(id, status) {
        if (!STATUSES.includes(status)) {
            throw new Error(`Invalid message status: ${status}`);
        }
        const { data, error } = await supabaseAdmin
            .from('contact_messages')
            .update({ status })
            .eq('id', id)
            .select('id, status')
            .maybeSingle();
        if (error) throw error;
        return data || null;
    }
}

ContactMessage.STATUSES = STATUSES;

module.exports = ContactMessage;
