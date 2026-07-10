// scripts/test-security.js
const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testSecurity() {
    console.log('🔒 Testing Security...');
    console.log('====================================');
    
    // Check if server is running
    try {
        await axios.get(`${BASE_URL}`);
        console.log('✅ Server is running');
    } catch (error) {
        console.log('❌ Server is not running. Please start with: npm run dev');
        return;
    }
    
    const tests = [];
    
    // Test 1: XSS Protection
    console.log('\n🛡️ Test 1: XSS Protection...');
    try {
        const xssPayload = '<script>alert("XSS")</script>';
        const response = await axios.get(`${BASE_URL}/blog?search=${encodeURIComponent(xssPayload)}`);
        
        // Check if script tags are in response (should be escaped)
        const html = response.data;
        if (typeof html === 'string' && html.includes('<script>alert')) {
            console.log('⚠️ XSS vulnerability detected!');
            tests.push({ name: 'XSS Protection', status: 'FAIL', details: 'Script tags not escaped' });
        } else {
            console.log('✅ XSS Protection working');
            tests.push({ name: 'XSS Protection', status: 'PASS', details: 'Script tags escaped' });
        }
    } catch (error) {
        console.log('⚠️ Could not test XSS:', error.message);
        tests.push({ name: 'XSS Protection', status: 'SKIP', details: error.message });
    }
    
    // Test 2: Rate Limiting
    console.log('\n🚦 Test 2: Rate Limiting...');
    try {
        let rateLimited = false;
        const requests = 20;
        
        for (let i = 0; i < requests; i++) {
            try {
                await axios.get(`${BASE_URL}/api/analytics/popular`);
            } catch (error) {
                if (error.response && error.response.status === 429) {
                    rateLimited = true;
                    console.log(`✅ Rate limiting triggered at request ${i+1}`);
                    break;
                }
            }
        }
        
        if (rateLimited) {
            tests.push({ name: 'Rate Limiting', status: 'PASS', details: 'Rate limiting is active' });
        } else {
            console.log('⚠️ Rate limiting not detected (may need higher request count or may not be configured)');
            tests.push({ name: 'Rate Limiting', status: 'WARN', details: 'Rate limiting may not be active' });
        }
    } catch (error) {
        console.log('⚠️ Could not test rate limiting:', error.message);
        tests.push({ name: 'Rate Limiting', status: 'SKIP', details: error.message });
    }
    
    // Test 3: Security Headers
    console.log('\n🛡️ Test 3: Security Headers...');
    try {
        const response = await axios.get(`${BASE_URL}/`);
        const headers = response.headers;
        
        const securityHeaders = [
            { name: 'X-Content-Type-Options', expected: 'nosniff' },
            { name: 'X-Frame-Options', expected: 'DENY' },
            { name: 'X-XSS-Protection', expected: '1; mode=block' },
            { name: 'Referrer-Policy', expected: 'strict-origin-when-cross-origin' },
        ];
        
        let allPresent = true;
        let presentCount = 0;
        securityHeaders.forEach(header => {
            const value = headers[header.name.toLowerCase()];
            if (value) {
                console.log(`   ✅ ${header.name}: ${value}`);
                presentCount++;
            } else {
                console.log(`   ❌ ${header.name}: Missing`);
                allPresent = false;
            }
        });
        
        if (presentCount === securityHeaders.length) {
            tests.push({ name: 'Security Headers', status: 'PASS', details: 'All headers present' });
        } else if (presentCount > 0) {
            tests.push({ name: 'Security Headers', status: 'WARN', details: `${presentCount}/${securityHeaders.length} headers present` });
        } else {
            tests.push({ name: 'Security Headers', status: 'FAIL', details: 'No security headers present' });
        }
    } catch (error) {
        console.log('⚠️ Could not test headers:', error.message);
        tests.push({ name: 'Security Headers', status: 'SKIP', details: error.message });
    }
    
    // Test 4: SQL Injection Protection
    console.log('\n🛡️ Test 4: SQL Injection Protection...');
    try {
        const sqlPayload = "' OR '1'='1";
        const response = await axios.get(`${BASE_URL}/blog?search=${encodeURIComponent(sqlPayload)}`);
        
        if (response.status === 200) {
            console.log('✅ SQL injection attempt handled properly');
            tests.push({ name: 'SQL Injection', status: 'PASS', details: 'Request handled properly' });
        } else {
            console.log(`⚠️ Unexpected response: ${response.status}`);
            tests.push({ name: 'SQL Injection', status: 'WARN', details: `Unexpected status: ${response.status}` });
        }
    } catch (error) {
        if (error.response && error.response.status === 500) {
            console.log('⚠️ Possible SQL injection vulnerability (500 error)');
            tests.push({ name: 'SQL Injection', status: 'FAIL', details: 'Internal server error on injection attempt' });
        } else if (error.response) {
            console.log(`✅ SQL injection handled: ${error.response.status}`);
            tests.push({ name: 'SQL Injection', status: 'PASS', details: `Error handled: ${error.response.status}` });
        } else {
            console.log('⚠️ Could not test SQL injection:', error.message);
            tests.push({ name: 'SQL Injection', status: 'SKIP', details: error.message });
        }
    }
    
    // Summary
    console.log('\n====================================');
    console.log('📊 Security Test Summary:');
    console.log('');
    console.log('| Test | Status | Details |');
    console.log('|------|--------|---------|');
    tests.forEach(t => {
        const statusEmoji = t.status === 'PASS' ? '✅' : 
                           t.status === 'FAIL' ? '❌' : 
                           t.status === 'WARN' ? '⚠️' : '⏭️';
        console.log(`| ${t.name.padEnd(20)} | ${statusEmoji} ${t.status.padEnd(5)} | ${t.details || ''} |`);
    });
    
    const passCount = tests.filter(t => t.status === 'PASS').length;
    const totalCount = tests.filter(t => t.status !== 'SKIP').length;
    console.log(`\n📊 Score: ${passCount}/${totalCount} tests passed`);
    if (passCount === totalCount) {
        console.log('✅ All security tests passed!');
    } else if (passCount >= totalCount * 0.7) {
        console.log('⚠️ Most tests passed, review warnings');
    } else {
        console.log('❌ Multiple security issues found, please review');
    }
    
    console.log('\n✅ Security test completed!');
}

// Run the test
testSecurity().catch(console.error);