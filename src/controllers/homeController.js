// src/controllers/homeController.js
const { Post, Comment } = require('../models');
const { formatDate, truncate, generateMetaDescription, buildUrl } = require('../utils/helpers');
const config = require('../config');

/**
 * Home page
 */
exports.getHome = async (req, res) => {
    try {
        // Get featured posts
        const featuredPost = await Post.findFeatured();
        
        // Get latest blog posts
        const { posts: latestPosts } = await Post.findAll({
            limit: 6,
            orderBy: 'published_date',
            orderDir: 'desc'
        });
        
        // Get popular posts
        let popularPosts = [];
        try {
            popularPosts = await Post.getPopular(5);
        } catch (error) {
            console.error('Error getting popular posts:', error);
            popularPosts = [];
        }
        
        // Get stats
        const allPosts = await Post.findAll({ limit: 1000 });
        const pubCount = allPosts.posts.filter(p => p.category && ['Review Articles', 'AI & Biotechnology', 'Research Articles', 'Others'].includes(p.category)).length;
        const blogCount = allPosts.posts.filter(p => p.category && !['Review Articles', 'AI & Biotechnology', 'Research Articles', 'Others'].includes(p.category)).length;
        
        // Format featured post
        let formattedFeatured = null;
        if (featuredPost) {
            formattedFeatured = {
                ...featuredPost,
                published_date: featuredPost.published_date ? formatDate(featuredPost.published_date, 'MMMM D, YYYY') : 'No date'
            };
        }
        
        // Format latest posts
        const formattedLatest = latestPosts.map(post => ({
            ...post,
            published_date: post.published_date ? formatDate(post.published_date, 'MMM D, YYYY') : 'No date'
        }));
        
        res.render('pages/home', {
            title: 'Home',
            currentPage: 'home',
            pageStyles: 'home',
            metaDescription: 'Pharmis Optimus Nexus – Advancing Pharmaceutical Knowledge, Research, and Innovation',
            featuredPost: formattedFeatured,
            latestPosts: formattedLatest,
            popularPosts,
            stats: {
                publications: pubCount || 0,
                blogs: blogCount || 0
            },
            ogTitle: 'Pharmis Optimus Nexus',
            ogDescription: 'Advancing Pharmaceutical Knowledge, Research, and Innovation',
            ogType: 'website',
            ogUrl: config.baseUrl,
            canonicalUrl: config.baseUrl
        });
    } catch (error) {
        console.error('Error in getHome:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            error: {
                message: 'Failed to load home page',
                status: 500
            }
        });
    }
};

// ... rest of the controller (getAbout, getContact, getRobots, getSitemap)

/**
 * About page
 */
exports.getAbout = async (req, res) => {
    try {
        res.render('pages/about', {
            title: 'About Us',
            currentPage: 'about',
            metaDescription: 'Learn about Pharmis Optimus Nexus – our mission, vision, and team dedicated to advancing pharmaceutical knowledge.',
            canonicalUrl: buildUrl('/about'),
            ogTitle: 'About Pharmis Optimus Nexus',
            ogDescription: 'Learn about our mission to advance pharmaceutical knowledge and research.'
        });
    } catch (error) {
        console.error('Error in getAbout:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            error: {
                message: 'Failed to load about page',
                status: 500
            }
        });
    }
};

/**
 * Contact page
 */
exports.getContact = async (req, res) => {
    try {
        res.render('pages/contact', {
            title: 'Contact Us',
            currentPage: 'contact',
            metaDescription: 'Get in touch with Pharmis Optimus Nexus – we\'d love to hear from you.',
            canonicalUrl: buildUrl('/contact'),
            ogTitle: 'Contact Pharmis Optimus Nexus',
            ogDescription: 'Get in touch with us for collaborations, inquiries, or feedback.'
        });
    } catch (error) {
        console.error('Error in getContact:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            error: {
                message: 'Failed to load contact page',
                status: 500
            }
        });
    }
};

/**
 * Robots.txt
 */
exports.getRobots = (req, res) => {
    const baseUrl = config.baseUrl;
    res.type('text/plain');
    res.send(`
User-agent: *
Allow: /
Sitemap: ${baseUrl}/sitemap.xml
    `);
};

/**
 * Sitemap generation
 */
exports.getSitemap = async (req, res) => {
    try {
        const { posts } = await Post.findAll({ limit: 1000 });
        const baseUrl = config.baseUrl;
        const now = new Date().toISOString();
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        
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