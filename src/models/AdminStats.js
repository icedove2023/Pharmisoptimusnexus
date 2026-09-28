// src/models/AdminStats.js
// Numbers for the admin overview. Service-role client.

const { supabaseAdmin } = require('../config/supabase');

async function headCount(query) {
    const { count, error } = await query;
    if (error) {
        console.error('AdminStats count failed:', error.message);
        return 0;
    }
    return count || 0;
}

async function getOverview() {
    const posts = () => supabaseAdmin.from('posts').select('id', { count: 'exact', head: true });

    const [blogs, publications, drafts, comments, newMessages, totals] = await Promise.all([
        headCount(posts().eq('kind', 'blog').eq('status', 'published')),
        headCount(posts().eq('kind', 'publication').eq('status', 'published')),
        headCount(posts().eq('status', 'draft')),
        headCount(supabaseAdmin.from('comments').select('id', { count: 'exact', head: true })),
        headCount(supabaseAdmin.from('contact_messages').select('id', { count: 'exact', head: true }).eq('status', 'new')),
        supabaseAdmin.from('posts').select('views, likes').limit(10000)
    ]);

    let views = 0;
    let likes = 0;
    if (totals.error) {
        console.error('AdminStats totals failed:', totals.error.message);
    } else {
        (totals.data || []).forEach((row) => {
            views += row.views || 0;
            likes += row.likes || 0;
        });
    }

    return { blogs, publications, drafts, comments, newMessages, views, likes };
}

module.exports = { getOverview };
