// scripts/test-email.js
const path = require('path');
const dotenv = require('dotenv');

// Load .env from project root (two levels up from this file)
// This file is at: /scripts/test-email.js
// Project root is: / (two levels up from scripts)
const envPath = path.join(__dirname, '../.env');
console.log(`📁 Loading .env from: ${envPath}`);

const result = dotenv.config({ path: envPath });

if (result.error) {
    console.log('❌ Error loading .env:', result.error.message);
    console.log(`💡 Please create .env at: ${envPath}`);
    console.log('\n📝 Example .env content:');
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
SESSION_SECRET=2b1ca220ef0d221d41158b7fff9a15edeeb8b13cfea795fabbaf9f23bc51d86fa4e943f27afe0b88de36d95db38846e62009288d13b4bb3bfafd1318d30755de

# Google Sheets
GOOGLE_SHEETS_PUBLICATIONS_URL=https://script.google.com/macros/s/YOUR_ID/exec
GOOGLE_SHEETS_BLOG_URL=https://script.google.com/macros/s/YOUR_ID/exec

# Base URL
BASE_URL=http://localhost:3000
    `);
    process.exit(1);
}

console.log('✅ .env loaded successfully!');

// Display loaded values
console.log('\n📋 Configuration loaded:');
console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'Not set'}`);
console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || 'Not set'}`);
console.log(`   SMTP_USER: ${process.env.SMTP_USER || 'Not set'}`);
console.log(`   SMTP_PASS: ${process.env.SMTP_PASS ? '********' : 'Not set'}`);

// Import email service (path from root)
const emailService = require('../src/services/emailService');

async function testEmail() {
    console.log('\n📧 Testing email service...');
    console.log('====================================');
    
    // Check if email is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.log('\n⚠️ Email credentials not configured.');
        console.log('\n💡 For testing, use Ethereal:');
        console.log('   1. Go to https://ethereal.email');
        console.log('   2. Click "Create Account"');
        console.log('   3. Copy the credentials to .env');
        console.log('\n💡 Or use Gmail App Password:');
        console.log('   1. Enable 2-Step Verification');
        console.log('   2. Go to https://myaccount.google.com/apppasswords');
        console.log('   3. Generate a password for "Mail"');
        return;
    }
    
    try {
        // Test 1: Send a test email
        console.log('\n📧 Test 1: Sending test email...');
        const testEmailTo = process.env.TEST_EMAIL || process.env.SMTP_USER;
        console.log(`   Sending to: ${testEmailTo}`);
        
        const result = await emailService.sendEmail({
            to: testEmailTo,
            subject: '🧪 Pharmis Optimus Nexus - Email Test',
            html: `
                <h1>🧪 Email Test - Pharmis Optimus Nexus</h1>
                <p>This is a test email from Pharmis Optimus Nexus.</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
                <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
                <hr>
                <p style="color: #666;">If you received this email, your email configuration is working correctly! 🎉</p>
            `,
            text: `
                Email Test - Pharmis Optimus Nexus
                
                This is a test email from Pharmis Optimus Nexus.
                
                Time: ${new Date().toLocaleString()}
                Environment: ${process.env.NODE_ENV || 'development'}
                
                If you received this email, your email configuration is working correctly! 🎉
            `
        });
        
        console.log('Test 1 Result:', result.success ? '✅ Success' : '❌ Failed');
        if (result.success) {
            console.log(`   📧 Message ID: ${result.messageId || 'N/A'}`);
            if (result.test) {
                console.log('   💡 Email was logged (test mode)');
                console.log('   📝 Check the console above for the email content');
            }
        } else {
            console.log(`   ❌ Error: ${result.error || 'Unknown error'}`);
        }
        
        console.log('\n====================================');
        console.log('✅ Email test completed!');
        
        if (result.test || result.success) {
            console.log('\n💡 If using Ethereal, check your inbox at: https://ethereal.email');
        }
        
    } catch (error) {
        console.error('❌ Email test failed:', error);
        console.log('\n💡 Troubleshooting tips:');
        console.log('1. Check your SMTP credentials in .env');
        console.log('2. For Gmail: Use App Password, not regular password');
        console.log('3. For Ethereal: Check the credentials are correct');
        console.log('4. Check your network connection');
    }
}

// Run the test
testEmail().catch(console.error);