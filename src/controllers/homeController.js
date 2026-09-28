// src/controllers/homeController.js
const { Post, Comment } = require('../models');
const TeamMember = require('../models/TeamMember');
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
        
        // Published counts per kind
        const counts = await Post.getCounts();
        const pubCount = counts.publication;
        const blogCount = counts.blog;
        
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
        const teamGroups = await TeamMember.listLeadersGrouped();
        res.render('pages/about', {
            title: 'About Us',
            currentPage: 'about',
            pageStyles: 'about',
            metaDescription: 'Learn about Pharmis Optimus Nexus – our mission, vision, and team dedicated to advancing pharmaceutical knowledge.',
            canonicalUrl: buildUrl('/about'),
            ogTitle: 'About Pharmis Optimus Nexus',
            ogDescription: 'Learn about our mission to advance pharmaceutical knowledge and research.',
            teamGroups
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
 * One team's full membership page (Health and Wellness, Media and
 * Publications, Community Outreach - not CEC, which only appears on the
 * About page). Leaders are listed first (see TeamMember.listByGroup).
 */
const TEAM_PAGES = {
    'health-and-wellness': 'Health and Wellness',
    'media-and-publications': 'Media and Publications',
    'community-outreach': 'Community Outreach'
};

exports.getTeamPage = async (req, res) => {
    const teamName = TEAM_PAGES[req.params.slug];
    if (!teamName) {
        return res.status(404).render('pages/error', {
            title: 'Not found',
            error: { message: 'That team could not be found.', status: 404 }
        });
    }

    try {
        const members = await TeamMember.listByGroup(teamName);
        res.render('pages/team', {
            title: teamName,
            currentPage: 'about',
            pageStyles: 'about',
            metaDescription: `Meet the ${teamName} team at Pharmis Optimus Nexus.`,
            canonicalUrl: buildUrl(`/teams/${req.params.slug}`),
            ogTitle: `${teamName} - Pharmis Optimus Nexus`,
            ogDescription: `Meet the ${teamName} team at Pharmis Optimus Nexus.`,
            teamName,
            members
        });
    } catch (error) {
        console.error('Error in getTeamPage:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            error: { message: 'Failed to load this team', status: 500 }
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
 * Sitemap generation (single implementation lives in sitemapController)
 */
exports.getSitemap = require('./sitemapController').generateSitemap;
