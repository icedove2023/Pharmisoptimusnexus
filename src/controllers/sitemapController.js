// src/controllers/sitemapController.js
const { Post } = require('../models');
const config = require('../config');

/**
 * Generate sitemap.xml
 */
exports.generateSitemap = async (req, res) => {
    try {
        const { posts } = await Post.findAll({ limit: 1000 });
        
        const baseUrl = config.baseUrl;
        const now = new Date().toISOString();
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
        // Static pages
        const staticPages = [
            { url: '/', priority: '1.0', changefreq: 'daily' },
            { url: '/about', priority: '0.8', changefreq: 'monthly' },
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
        const publicationCategories = ['Review Articles', 'AI & Biotechnology', 'Research Articles', 'Others'];
        const blogPosts = posts.filter(p => p.category && !publicationCategories.includes(p.category));
        blogPosts.forEach(post => {
            xml += `  <url>\n`;
            xml += `    <loc>${baseUrl}/blog/${post.slug}</loc>\n`;
            xml += `    <lastmod>${post.updated_at || now}</lastmod>\n`;
            xml += `    <changefreq>weekly</changefreq>\n`;
            xml += `    <priority>0.7</priority>\n`;
            xml += `  </url>\n`;
        });
        
        // Publications
        const pubPosts = posts.filter(p => p.category && publicationCategories.includes(p.category));
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