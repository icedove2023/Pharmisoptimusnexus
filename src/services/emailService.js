// src/services/emailService.js
const nodemailer = require('nodemailer');
const config = require('../config');

class EmailService {
    constructor() {
        this.transporter = null;
        this.enabled =  process.env.EMAIL_ENABLED !== 'false';
        this.fromEmail = process.env.FROM_EMAIL || 'noreply@pharmisnexus.com';
        this.fromName = process.env.FROM_NAME || 'Pharmis Optimus Nexus';
        this.initialize();
    }

    /**
     * Initialize nodemailer transporter
     */
    initialize() {
        try {
            if (!this.enabled) {
                console.log('📧 Email service disabled (test mode)');
                return;
            }

            // Check if credentials are configured
            if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
                console.warn('⚠️ Email credentials not configured. Email sending will be disabled.');
                this.enabled = false;
                return;
            }

            // Create transporter with improved configuration
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_PORT === '465',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                },
                tls: {
                    rejectUnauthorized: process.env.NODE_ENV === 'production'
                },
                pool: true,
                maxConnections: 5,
                rateLimit: 10,
                // Added for better reliability
                connectionTimeout: 10000,
                greetingTimeout: 10000,
                socketTimeout: 20000,
            });

            // Verify connection (don't await here, do it async)
            this.verifyConnection();

            console.log(`📧 Email service initialized with ${process.env.SMTP_HOST}`);
        } catch (error) {
            console.error('❌ Email service initialization failed:', error);
            this.enabled = false;
        }
    }

    /**
     * Verify email connection
     */
    async verifyConnection() {
        try {
            if (this.transporter) {
                await this.transporter.verify();
                console.log('✅ Email connection verified');
            }
        } catch (error) {
            console.error('❌ Email connection verification failed:', error);
            this.enabled = false;
        }
    }

    /**
     * Send an email
     */
    async sendEmail({ 
        to, 
        subject, 
        html, 
        text, 
        from = null, 
        attachments = [],
        cc = null,
        bcc = null,
        replyTo = null,
        priority = 'normal'
    }) {
        // Check if email service is enabled
        if (!this.enabled) {
            console.log('📧 Email disabled, would have sent:', { to, subject });
            return { 
                success: true, 
                message: 'Email service disabled (test mode)',
                test: true,
                simulated: true
            };
        }

        // Validate transporter
        if (!this.transporter) {
            console.error('❌ Email transporter not initialized');
            return { 
                success: false, 
                error: 'Email service not initialized' 
            };
        }

        // Validate recipient
        if (!to) {
            return { 
                success: false, 
                error: 'Recipient email is required' 
            };
        }

        // Log email attempt (but mask sensitive info)
        console.log(`📧 Sending email to: ${this.maskEmail(to)}`);
        console.log(`📧 Subject: ${subject}`);

        try {
            // Prepare email options
            const mailOptions = {
                from: from || `${this.fromName} <${this.fromEmail}>`,
                to: Array.isArray(to) ? to.join(', ') : to,
                subject: subject,
                html: html,
                text: text || this.htmlToText(html || ''),
                attachments: attachments,
                cc: cc,
                bcc: bcc,
                replyTo: replyTo || this.fromEmail,
                priority: priority,
                headers: {
                    'X-Entity-Ref-ID': `pharmis-${Date.now()}`,
                    'X-Mailer': 'Pharmis Optimus Nexus Mailer',
                    'X-Priority': priority === 'high' ? '1' : '3'
                }
            };

            // Send email
            const info = await this.transporter.sendMail(mailOptions);

            console.log(`✅ Email sent to ${this.maskEmail(to)}: ${info.messageId}`);
            return {
                success: true,
                messageId: info.messageId,
                accepted: info.accepted || [],
                rejected: info.rejected || [],
                response: info.response || 'Message sent'
            };
        } catch (error) {
            console.error('❌ Email sending failed:', error);
            return {
                success: false,
                error: error.message,
                code: error.code,
                command: error.command
            };
        }
    }

    /**
     * Mask email for logging (show only first character and domain)
     */
    maskEmail(email) {
        if (!email) return 'unknown';
        const parts = email.split('@');
        if (parts.length !== 2) return email;
        const name = parts[0];
        const domain = parts[1];
        const maskedName = name.length > 2 
            ? name[0] + '***' + name[name.length - 1] 
            : name[0] + '***';
        return `${maskedName}@${domain}`;
    }

    /**
     * Convert HTML to plain text
     */
    htmlToText(html) {
        if (!html) return '';
        return html
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Send contact form notification
     */
    async sendContactNotification({ name, email, subject, message }) {
        const timestamp = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>New Contact Form Submission</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #17222B; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
                    .field { margin-bottom: 15px; }
                    .field-label { font-weight: bold; color: #17222B; }
                    .field-value { padding: 10px; background: white; border: 1px solid #eee; border-radius: 3px; margin-top: 5px; }
                    .footer { margin-top: 20px; text-align: center; color: #999; font-size: 12px; }
                    .badge { display: inline-block; background: #F16D78; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 style="margin: 0;">📩 New Contact Form Submission</h2>
                    <p style="margin: 5px 0 0; opacity: 0.8;">Pharmis Optimus Nexus</p>
                </div>
                <div class="content">
                    <div class="field">
                        <div class="field-label">👤 Name</div>
                        <div class="field-value">${this.escapeHtml(name)}</div>
                    </div>
                    <div class="field">
                        <div class="field-label">📧 Email</div>
                        <div class="field-value"><a href="mailto:${this.escapeHtml(email)}">${this.escapeHtml(email)}</a></div>
                    </div>
                    ${subject ? `
                    <div class="field">
                        <div class="field-label">📝 Subject</div>
                        <div class="field-value">${this.escapeHtml(subject)}</div>
                    </div>
                    ` : ''}
                    <div class="field">
                        <div class="field-label">💬 Message</div>
                        <div class="field-value" style="white-space: pre-wrap;">${this.escapeHtml(message)}</div>
                    </div>
                    <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                    <p style="color: #999; font-size: 14px; margin: 0;">
                        <span class="badge">${timestamp}</span>
                        <span style="margin-left: 10px;">IP: ${process.env.NODE_ENV === 'production' ? 'Hidden' : 'Development'}</span>
                    </p>
                </div>
                <div class="footer">
                    <p>This email was sent from the Pharmis Optimus Nexus contact form.</p>
                    <p>© ${new Date().getFullYear()} Pharmis Optimus Nexus. All rights reserved.</p>
                </div>
            </body>
            </html>
        `;

        const text = `
            New Contact Form Submission
            =============================
            Name: ${name}
            Email: ${email}
            ${subject ? `Subject: ${subject}` : ''}
            Message: ${message}
            -----------------------------
            Sent: ${timestamp}
            From: Pharmis Optimus Nexus Contact Form
        `;

        return this.sendEmail({
            to: process.env.CONTACT_EMAIL || 'pharmisoptimusofficials@gmail.com',
            subject: `📩 Contact Form: ${subject || 'New Message'} from ${name}`,
            html,
            text,
            replyTo: email,
            priority: 'high'
        });
    }

    /**
     * Send comment notification
     */
    async sendCommentNotification({ postTitle, author, email, content, postUrl }) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>New Comment</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #17222B; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
                    .comment-box { background: white; padding: 15px; border-left: 4px solid #F16D78; margin: 15px 0; }
                    .btn { display: inline-block; background: #F16D78; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
                    .footer { margin-top: 20px; text-align: center; color: #999; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 style="margin: 0;">💬 New Comment</h2>
                    <p style="margin: 5px 0 0; opacity: 0.8;">${this.escapeHtml(postTitle)}</p>
                </div>
                <div class="content">
                    <p><strong>Author:</strong> ${this.escapeHtml(author)}</p>
                    ${email ? `<p><strong>Email:</strong> ${this.escapeHtml(email)}</p>` : ''}
                    <div class="comment-box">
                        <p style="margin: 0; white-space: pre-wrap;">${this.escapeHtml(content)}</p>
                    </div>
                    <p style="margin-top: 20px;">
                        <a href="${postUrl}" class="btn">View Comment →</a>
                    </p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Pharmis Optimus Nexus</p>
                </div>
            </body>
            </html>
        `;

        const text = `
            New Comment on "${postTitle}"
            Author: ${author}
            ${email ? `Email: ${email}` : ''}
            Comment: ${content}
            View: ${postUrl}
        `;

        return this.sendEmail({
            to: process.env.NOTIFICATION_EMAIL || 'pharmisoptimusofficials@gmail.com',
            subject: `💬 New Comment: ${postTitle}`,
            html,
            text
        });
    }

    /**
     * Send welcome email
     */
    async sendWelcomeEmail(email, name) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to Pharmis Optimus Nexus</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #17222B; color: white; padding: 30px 20px; text-align: center; border-radius: 5px 5px 0 0; }
                    .content { background: #f9f9f9; padding: 30px 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
                    .footer { margin-top: 20px; text-align: center; color: #999; font-size: 12px; }
                    .btn { display: inline-block; background: #F16D78; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
                    .feature-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
                    .feature-item { background: white; padding: 15px; border-radius: 5px; text-align: center; border: 1px solid #eee; }
                </style>
            </head>
            <body>
                <div class="header">
                    <img src="${config.baseUrl}/images/Classlogo.png" alt="Pharmis Optimus Nexus" style="max-width: 100px; margin-bottom: 10px;">
                    <h1 style="margin: 10px 0 0;">Welcome to Pharmis Optimus Nexus!</h1>
                </div>
                <div class="content">
                    <h2>Hello ${this.escapeHtml(name || 'there')}! 👋</h2>
                    
                    <p>Thank you for subscribing to Pharmis Optimus Nexus. We're thrilled to have you as part of our community!</p>
                    
                    <p>Here's what you can expect:</p>
                    
                    <div class="feature-grid">
                        <div class="feature-item">
                            <strong>📚 Latest Research</strong>
                            <p style="font-size: 14px; margin: 5px 0 0;">Stay updated with the latest pharmaceutical research</p>
                        </div>
                        <div class="feature-item">
                            <strong>💡 Health Insights</strong>
                            <p style="font-size: 14px; margin: 5px 0 0;">Evidence-based health information and tips</p>
                        </div>
                        <div class="feature-item">
                            <strong>🤝 Community</strong>
                            <p style="font-size: 14px; margin: 5px 0 0;">Connect with like-minded health enthusiasts</p>
                        </div>
                        <div class="feature-item">
                            <strong>🎯 Innovation</strong>
                            <p style="font-size: 14px; margin: 5px 0 0;">Explore cutting-edge pharmaceutical innovations</p>
                        </div>
                    </div>
                    
                    <p style="text-align: center; margin: 30px 0;">
                        <a href="${config.baseUrl}/blog" class="btn">Start Reading →</a>
                    </p>
                    
                    <p style="color: #666; font-size: 14px; margin-top: 20px;">
                        If you have any questions or suggestions, feel free to <a href="${config.baseUrl}/contact" style="color: #F16D78;">reach out to us</a>.
                    </p>
                </div>
                <div class="footer">
                    <p>© ${new Date().getFullYear()} Pharmis Optimus Nexus. All rights reserved.</p>
                    <p><a href="${config.baseUrl}/unsubscribe" style="color: #F16D78;">Unsubscribe</a> anytime.</p>
                </div>
            </body>
            </html>
        `;

        const text = `
            Welcome to Pharmis Optimus Nexus!
            
            Hello ${name || 'there'}!
            
            Thank you for subscribing to Pharmis Optimus Nexus. We're thrilled to have you as part of our community!
            
            Here's what you can expect:
            - Latest Research: Stay updated with the latest pharmaceutical research
            - Health Insights: Evidence-based health information and tips
            - Community: Connect with like-minded health enthusiasts
            - Innovation: Explore cutting-edge pharmaceutical innovations
            
            Start reading: ${config.baseUrl}/blog
            
            If you have any questions, feel free to reach out: ${config.baseUrl}/contact
            
            © ${new Date().getFullYear()} Pharmis Optimus Nexus
        `;

        return this.sendEmail({
            to: email,
            subject: 'Welcome to Pharmis Optimus Nexus! 🎉',
            html,
            text
        });
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
}

module.exports = new EmailService();