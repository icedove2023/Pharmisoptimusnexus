// scripts/test-api.js
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testAPI() {
    console.log('🔍 Testing API Endpoints...');
    console.log('====================================');
    console.log(`📡 Base URL: ${BASE_URL}`);
    
    // Check if server is running
    try {
        await axios.get(`${BASE_URL}`);
        console.log('✅ Server is running');
    } catch (error) {
        console.log('❌ Server is not running. Please start with: npm run dev');
        console.log('💡 Then run this test again');
        return;
    }
    
    let testPostId = null;
    let testCommentId = null;
    
    try {
        // Test 1: Get Popular Posts
        console.log('\n📊 Test 1: Get Popular Posts...');
        try {
            const response = await axios.get(`${BASE_URL}/api/analytics/popular`);
            console.log(`✅ Found ${response.data.posts?.length || 0} popular posts`);
            if (response.data.posts && response.data.posts.length > 0) {
                testPostId = response.data.posts[0].id;
                console.log(`   📝 Using post ID: ${testPostId} for further tests`);
            }
        } catch (error) {
            if (error.response) {
                console.log(`⚠️ API endpoint returned: ${error.response.status} - ${error.response.data?.error || error.message}`);
            } else {
                console.log('⚠️ Could not get popular posts:', error.message);
            }
        }
        
        // If no post from popular, try to get one from blog
        if (!testPostId) {
            console.log('\n📝 Trying to get a post from blog...');
            try {
                const response = await axios.get(`${BASE_URL}/api/posts?limit=1`);
                if (response.data && response.data.posts && response.data.posts.length > 0) {
                    testPostId = response.data.posts[0].id;
                    console.log(`   📝 Using post ID: ${testPostId}`);
                }
            } catch (error) {
                console.log('⚠️ Could not get posts:', error.message);
            }
        }
        
        // If still no post, skip post-specific tests
        if (!testPostId) {
            console.log('\n⚠️ No test post available, skipping post-specific tests');
            console.log('💡 You can create a post first or test with existing posts');
        } else {
            // Test 2: Toggle Like
            console.log('\n❤️ Test 2: Toggle Like...');
            try {
                const response = await axios.post(`${BASE_URL}/api/likes/${testPostId}`);
                console.log(`✅ Like toggled:`, response.data);
            } catch (error) {
                console.log('⚠️ Could not toggle like:', error.response?.data?.error || error.message);
            }
            
            // Test 3: Get Like Count
            console.log('\n❤️ Test 3: Get Like Count...');
            try {
                const response = await axios.get(`${BASE_URL}/api/likes/${testPostId}`);
                console.log(`✅ Like count: ${response.data.likes || 0}`);
            } catch (error) {
                console.log('⚠️ Could not get like count:', error.response?.data?.error || error.message);
            }
            
            // Test 4: Get Comments
            console.log('\n💬 Test 4: Get Comments...');
            try {
                const response = await axios.get(`${BASE_URL}/api/comments/${testPostId}`);
                console.log(`✅ Found ${response.data.comments?.length || 0} comments`);
            } catch (error) {
                console.log('⚠️ Could not get comments:', error.response?.data?.error || error.message);
            }
            
            // Test 5: Add Comment
            console.log('\n💬 Test 5: Add Comment...');
            try {
                const commentData = {
                    author: 'Test User',
                    email: 'test@example.com',
                    content: 'This is a test comment from the API test script. ' + new Date().toISOString()
                };
                const response = await axios.post(
                    `${BASE_URL}/api/comments/${testPostId}`,
                    commentData
                );
                console.log(`✅ Comment added:`, response.data);
                if (response.data.comment) {
                    testCommentId = response.data.comment.id;
                }
            } catch (error) {
                console.log('⚠️ Could not add comment:', error.response?.data?.error || error.message);
            }
            
            // Test 6: Track View
            console.log('\n👁️ Test 6: Track View...');
            try {
                const response = await axios.post(`${BASE_URL}/api/views/${testPostId}`);
                console.log(`✅ View tracked:`, response.data);
            } catch (error) {
                console.log('⚠️ Could not track view:', error.response?.data?.error || error.message);
            }
            
            // Test 7: Get View Count
            console.log('\n👁️ Test 7: Get View Count...');
            try {
                const response = await axios.get(`${BASE_URL}/api/views/${testPostId}`);
                console.log(`✅ View count: ${response.data.views || 0}`);
                if (response.data.uniqueViews) {
                    console.log(`   👥 Unique views: ${response.data.uniqueViews}`);
                }
            } catch (error) {
                console.log('⚠️ Could not get view count:', error.response?.data?.error || error.message);
            }
        }
        
        // Test 8: Analytics
        console.log('\n📈 Test 8: Get View Analytics...');
        try {
            const response = await axios.get(`${BASE_URL}/api/analytics/views`);
            console.log(`✅ Analytics data received`);
            if (response.data.stats) {
                console.log(`   📊 ${response.data.stats.length || 0} data points`);
            }
        } catch (error) {
            console.log('⚠️ Could not get analytics:', error.response?.data?.error || error.message);
        }
        
        // Test 9: Contact Form
        console.log('\n📧 Test 9: Contact Form...');
        try {
            const contactData = {
                name: 'Test User',
                email: 'test@example.com',
                subject: 'Test Subject',
                message: 'This is a test message from the API test script.'
            };
            const response = await axios.post(
                `${BASE_URL}/api/contact`,
                contactData
            );
            console.log(`✅ Contact form submitted:`, response.data);
        } catch (error) {
            console.log('⚠️ Could not submit contact form:', error.response?.data?.error || error.message);
        }
        
        console.log('\n====================================');
        console.log('✅ API tests completed!');
        console.log('\n📊 Summary:');
        if (testPostId) {
            console.log(`   Tested with post ID: ${testPostId}`);
        } else {
            console.log('   ⚠️ Some tests were skipped due to no test post');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n💡 Troubleshooting tips:');
        console.log('1. Make sure the server is running: npm run dev');
        console.log('2. Check BASE_URL in .env');
        console.log('3. Check if all routes are registered');
        console.log('4. Check for CORS issues');
    }
}

// Run the test
testAPI().catch(console.error);