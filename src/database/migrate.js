// src/database/migrate.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();
    
    for (const file of files) {
        if (!file.endsWith('.sql')) continue;
        
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        
        try {
            // Split SQL into statements (basic implementation)
            const statements = sql.split(';').filter(s => s.trim());
            for (const stmt of statements) {
                const { error } = await supabase.rpc('exec_sql', { query: stmt + ';' });
                if (error) {
                    console.error(`Error in ${file}:`, error);
                    process.exit(1);
                }
            }
            console.log(`✅ Migration ${file} complete`);
        } catch (error) {
            console.error(`❌ Migration failed: ${file}`, error);
            process.exit(1);
        }
    }
    
    console.log('✅ All migrations complete');
}

// Run migrations
runMigrations().catch(console.error);