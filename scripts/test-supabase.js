// scripts/test-supabase.js
const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

// Check if .env exists and has required variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    console.log('❌ Supabase credentials not found in .env');
    console.log('📝 Please create a .env file in the project root with:');
    console.log('   SUPABASE_URL=https://your-project-id.supabase.co');
    console.log('   SUPABASE_ANON_KEY=your-anon-key');
    console.log('   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key');
    process.exit(1);
}

// Import Supabase config
const { supabase, supabaseAdmin } = require('../src/config/supabase');

async function testSupabase() {
    console.log('🔍 Testing Supabase Connection...');
    console.log('====================================');
    
    try {
        // Test 1: Display configuration
        console.log('\n📋 Configuration:');
        console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL}`);
        console.log(`   SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '********' : 'Not set'}`);
        console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '********' : 'Not set'}`);
        
        // Test 2: Check connection
        console.log('\n📡 Test 1: Checking connection...');
        const { data: healthCheck, error: healthError } = await supabase
            .from('posts')
            .select('count', { count: 'exact', head: true });
        
        if (healthError) {
            console.log('❌ Connection failed:', healthError.message);
            console.log('💡 Make sure your Supabase project is active and the tables exist');
            return;
        }
        console.log('✅ Connection successful!');
        
        // Test 3: Check tables
        console.log('\n📊 Test 2: Checking tables...');
        const tables = ['posts', 'comments', 'likes', 'views', 'sync_log'];
        const existingTables = [];
        
        for (const table of tables) {
            const { data, error } = await supabase
                .from(table)
                .select('count', { count: 'exact', head: true });
            
            if (error && error.code !== 'PGRST116') {
                if (error.code === '42P01') {
                    console.log(`   ❌ ${table}: Table does not exist`);
                } else {
                    console.log(`   ❌ ${table}: ${error.message}`);
                }
            } else {
                console.log(`   ✅ ${table}: Exists`);
                existingTables.push(table);
            }
        }
        
        // Test 4: Check functions
        console.log('\n🔧 Test 3: Checking functions...');
        const functions = ['increment_views', 'toggle_like', 'get_popular_posts', 'sync_posts'];
        
        for (const func of functions) {
            try {
                const { error } = await supabase.rpc(func, {
                    post_id: '00000000-0000-0000-0000-000000000000'
                });
                
                if (error && error.message && error.message.includes('function')) {
                    console.log(`   ❌ ${func}: Function does not exist`);
                } else if (error) {
                    console.log(`   ⚠️ ${func}: ${error.message}`);
                } else {
                    console.log(`   ✅ ${func}: Exists`);
                }
            } catch (e) {
                console.log(`   ⚠️ ${func}: Could not test - ${e.message}`);
            }
        }
        
        // Test 5: Insert a test post (using admin key)
        console.log('\n📝 Test 4: Inserting test post...');
        const testPost = {
            title: '🔬 Test Post - ' + new Date().toISOString(),
            slug: 'test-post-' + Date.now(),
            excerpt: 'This is a test post created by the test script.',
            category: 'Test',
            featured: false,
            published_date: new Date().toISOString().split('T')[0],
            read_time: '5 mins',
            authors: ['Test Author'],
            tags: ['test', 'automation']
        };
        
        const { data: inserted, error: insertError } = await supabaseAdmin
            .from('posts')
            .insert(testPost)
            .select()
            .single();
        
        if (insertError) {
            console.log('❌ Insert failed:', insertError.message);
            if (insertError.message.includes('permission denied')) {
                console.log('💡 Make sure SUPABASE_SERVICE_ROLE_KEY is correct');
            }
        } else {
            console.log('✅ Test post inserted successfully!');
            console.log(`   ID: ${inserted.id}`);
            console.log(`   Title: ${inserted.title}`);
            
            // Clean up
            console.log('🧹 Cleaning up test post...');
            const { error: deleteError } = await supabaseAdmin
                .from('posts')
                .delete()
                .eq('id', inserted.id);
            
            if (deleteError) {
                console.log('⚠️ Cleanup failed:', deleteError.message);
            } else {
                console.log('✅ Test post deleted successfully');
            }
        }
        
        console.log('\n====================================');
        console.log('✅ Supabase test completed!');
        console.log(`\n📊 Summary:`);
        console.log(`   Tables found: ${existingTables.length}/${tables.length}`);
        if (existingTables.length === tables.length) {
            console.log('   ✅ Database is ready!');
        } else {
            console.log('   ⚠️ Some tables are missing. Run migrations first.');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        console.log('\n💡 Troubleshooting tips:');
        console.log('1. Check SUPABASE_URL in .env');
        console.log('2. Check SUPABASE_ANON_KEY in .env');
        console.log('3. Make sure your Supabase project is active');
        console.log('4. Check network connectivity');
        console.log('5. Verify tables exist in the database');
    }
}

// Run the test
testSupabase().catch(console.error);