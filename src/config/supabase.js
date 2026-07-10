// src/config/supabase.js
const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

// Validate Supabase configuration
if (!config.supabase.url || !config.supabase.anonKey) {
    console.warn('⚠️ Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
}

// Public client (for frontend/API - uses anon key)
const supabase = createClient(
    config.supabase.url || '',
    config.supabase.anonKey || '',
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true
        },
        db: {
            schema: 'public'
        }
    }
);

// Admin client (for server-side operations - bypasses RLS)
const supabaseAdmin = createClient(
    config.supabase.url || '',
    config.supabase.serviceRoleKey || '',
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

// Real-time client
const supabaseRealtime = createClient(
    config.supabase.url || '',
    config.supabase.anonKey || '',
    {
        auth: {
            autoRefreshToken: true,
            persistSession: true
        },
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        }
    }
);

module.exports = {
    supabase,
    supabaseAdmin,
    supabaseRealtime
};