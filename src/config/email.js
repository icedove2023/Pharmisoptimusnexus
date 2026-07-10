// src/config/email.js
const config = require('./index');

// Email configuration based on environment
const emailConfig = {
    // Development: Use ethereal.email for testing
    dev: {
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: process.env.ETHEREAL_USER || '',
            pass: process.env.ETHEREAL_PASS || ''
        }
    },
    // Production: Use your SMTP provider
    prod: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        },
        tls: {
            rejectUnauthorized: true
        }
    },
    // Test: No actual sending
    test: {
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: 'test@example.com',
            pass: 'test'
        }
    }
};

// Get config based on environment
const getConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    return emailConfig[env] || emailConfig.dev;
};

// Validate email config
const validateEmailConfig = () => {
    const config = getConfig();
    if (process.env.NODE_ENV === 'production') {
        if (!config.auth.user || !config.auth.pass) {
            console.warn('⚠️ Email credentials not configured for production!');
            return false;
        }
    }
    return true;
};

module.exports = {
    emailConfig,
    getConfig,
    validateEmailConfig
};