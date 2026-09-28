// src/config/supabase.js
const { createClient } = require('@supabase/supabase-js');
const config = require('./index');

// Validate Supabase configuration
if (!config.supabase.url || !config.supabase.anonKey) {
    console.warn('Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
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

// Throwaway client for signing an admin in or refreshing their session.
// A new instance every time, so one person's session can never leak into
// another request or into the shared clients above.
function createAuthClient() {
    return createClient(
        config.supabase.url || '',
        config.supabase.anonKey || '',
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false
            }
        }
    );
}

module.exports = {
    supabase,
    supabaseAdmin,
    createAuthClient
};