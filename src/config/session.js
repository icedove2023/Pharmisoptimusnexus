// src/config/session.js
const config = require('./index');

const sessionConfig = {
    secret: config.session.secret,
    name: 'pharmis.sid',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: config.nodeEnv === 'production',
        httpOnly: true,
        maxAge: config.session.maxAge,
        sameSite: 'lax'
    }
};

// Additional security for production
if (config.nodeEnv === 'production') {
    sessionConfig.cookie.secure = true;
    sessionConfig.cookie.domain = process.env.COOKIE_DOMAIN;
    sessionConfig.proxy = true;
}

module.exports = sessionConfig;