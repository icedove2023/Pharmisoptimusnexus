// src/controllers/sitemapController.js
const { Post } = require('../models');
const config = require('../config');

/**
 * Generate sitemap.xml
 */
exports.generateSitemap = async (req, res) => {
    try {
        const [blogResult, pubResult] = await Promise.all([
            Post.findAll({ kind: 'blog', limit: 1000 }),
            Post.findAll({ kind: 'publication', limit: 1000 })
        ]);
        const blogPosts = blogResult.posts;
        const pubPosts = pubResult.posts;
        
        const baseUrl = config.baseUrl;
        const now = new Date().toISOString();
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        // Static pages
        const staticPages = [
            { url: '/', priority: '1.0', changefreq: 'daily' },
            { url: '/about', priority: '0.8', changefreq: 'monthly' },
            { url: '/teams/health-and-wellness', priority: '0.5', changefreq: 'monthly' },
            { url: '/teams/media-and-publications', priority: '0.5', changefreq: 'monthly' },
            { url: '/teams/community-outreach', priority: '0.5', changefreq: 'monthly' },
            { url: '/contact', priority: '0.8', changefreq: 'monthly' },
            { url: '/blog', priority: '0.9', changefreq: 'daily' },
            { url: '/publications', priority: '0.9', changefreq: 'daily' }
        ];
        
        staticPages.forEach(page => {
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}${page.url}</loc>\n`;
            xml += `    <lastmod>${now}</lastmod>\n`;
            xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
            xml += `    <priority>${page.priority}</priority>\n`;
            xml += `  </url>\n`;
        });
        
        // Blog posts
        blogPosts.forEach(post => {
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
            xml += `    <lastmod>${post.updated_at || now}</lastmod>\n`;
            xml += `    <changefreq>weekly</changefreq>\n`;
            xml += `    <priority>0.7</priority>\n`;
            xml += `  </url>\n`;
        });
        
        // Publications
        pubPosts.forEach(post => {
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}/publications/${post.slug}</loc>\n`;
            xml += `    <lastmod>${post.updated_at || now}</lastmod>\n`;
            xml += `    <changefreq>monthly</changefreq>\n`;
            xml += `    <priority>0.6</priority>\n`;
            xml += `  </url>\n`;
        });
        
        xml += '</urlset>';
        
        res.header('Content-Type', 'application/xml');
        res.send(xml);
    } catch (error) {
        console.error('Error generating sitemap:', error);
        res.status(500).send('Error generating sitemap');
    }
};