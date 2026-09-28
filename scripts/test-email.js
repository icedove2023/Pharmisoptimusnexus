// scripts/test-email.js
const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root (two levels up from this file)
// This file is at: /scripts/test-email.js
// Project root is: / (two levels up from scripts)
const envPath = path.join(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);

const result = dotenv.config({ path: envPath });

if (result.error) {
    console.log('[FAIL] Error loading .env:', result.error.message);
    console.log(`Please create .env at: ${envPath}`);
    console.log('\nExample .env content:');
    console.log(`
# Email Configuration
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your-username@ethereal.email
SMTP_PASS=your-password
FROM_EMAIL=noreply@pharmisnexus.com
FROM_NAME=Pharmis Optimus Nexus
CONTACT_EMAIL=pharmisoptimusofficials@gmail.com
TEST_EMAIL=your-email@example.com

# Supabase (add your keys)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Session Secret
SESSION_SECRET=generate-with-scripts-generate-secret

# Base URL
BASE_URL=http://localhost:3000
    `);
    process.exit(1);
}

console.log('[PASS] .env loaded successfully!');

// Display loaded values
console.log('\nConfiguration loaded:');
console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'Not set'}`);
console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || 'Not set'}`);
console.log(`   SMTP_USER: ${process.env.SMTP_USER || 'Not set'}`);
console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '********' : 'Not set'}`);

// Import email service (path from root)
const emailService = require('../src/services/emailService');

async function testEmail() {
    console.log('\nTesting email service...');
    console.log('====================================');
    
    // Check if email is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('\n[WARN] Email credentials not configured.');
        console.log('\nFor testing, use Ethereal:');
        console.log('   1. Go to https://ethereal.email');
        console.log('   2. Click "Create Account"');
        console.log('   3. Copy the credentials to .env');
        console.log('\nOr use Gmail App Password:');
        console.log('   1. Enable 2-Step Verification');
        console.log('   2. Go to https://myaccount.google.com/apppasswords');
        console.log('   3. Generate a password for "Mail"');
        return;
    }
    
    try {
        // Test 1: Send a test email
        console.log('\nTest 1: Sending test email...');
        const testEmailTo = process.env.TEST_EMAIL || process.env.SMTP_USER;
        console.log(`   Sending to: ${testEmailTo}`);
        
        const result = await emailService.sendEmail({
            to: testEmailTo,
            subject: 'Pharmis Optimus Nexus - Email Test',
            html: `
                <h1>Email Test - Pharmis Optimus Nexus</h1>
                <p>This is a test email from Pharmis Optimus Nexus.</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
                <hr>
                <p style="color: #666;">If you received this email, your email configuration is working correctly! </p>
            `,
            text: `
                Email Test - Pharmis Optimus Nexus
                
                This is a test email from Pharmis Optimus Nexus.
                
                Time: ${new Date().toLocaleString()}
                Environment: ${process.env.NODE_ENV || 'development'}
                
                If you received this email, your email configuration is working correctly! 
            `
        });
        
        console.log('Test 1 Result:', result.success ? '[PASS] Success' : '[FAIL] Failed');
        if (result.success) {
            console.log(`   Message ID: ${result.messageId || 'N/A'}`);
            if (result.test) {
                console.log('   Email was logged (test mode)');
                console.log('   Check the console above for the email content');
            }
        } else {
            console.log(`   [FAIL] Error: ${result.error || 'Unknown error'}`);
        }
        
        console.log('\n====================================');
        console.log('[PASS] Email test completed!');
        
        if (result.test || result.success) {
            console.log('\nIf using Ethereal, check your inbox at: https://ethereal.email');
        }
        
    } catch (error) {
        console.error('[FAIL] Email test failed:', error);
        console.log('\nTroubleshooting tips:');
        console.log('1. Check your SMTP credentials in .env');
        console.log('2. For Gmail: Use App Password, not regular password');
        console.log('3. For Ethereal: Check the credentials are correct');
        console.log('4. Check your network connection');
    }
}

// Run the test
testEmail().catch(console.error);