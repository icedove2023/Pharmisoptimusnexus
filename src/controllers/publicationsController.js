// src/controllers/publicationsController.js
const { Post, Comment } = require('../models');
const { formatDate, truncate, generateMetaDescription, buildUrl } = require('../utils/helpers');
const config = require('../config');

/**
 * Publications listing page
 */
exports.getPublications = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const category = req.query.category || null;
        const search = req.query.search || null;
        const year = req.query.year || null;
        
        const publicationCategories = ['Review Articles', 'AI & Biotechnology', 'Research Articles', 'Others'];
        
        // Get all posts
        const result = await Post.findAll({
            page,
            limit,
            category,
            search,
            orderBy: 'published_date',
            orderDir: 'desc'
        });
        
        // Filter to only publications
        const allPosts = result.posts || [];
        let publications = allPosts.filter(p => 
            p.category && publicationCategories.includes(p.category)
        );
        
        // Apply year filter
        if (year) {
            publications = publications.filter(p => {
                const pubYear = new Date(p.published_date).getFullYear();
                return pubYear === parseInt(year);
            });
        }
        
        // Get all publications for counts
        const allResult = await Post.findAll({ limit: 1000 });
        const allPublications = allResult.posts.filter(p => 
            p.category && publicationCategories.includes(p.category)
        );
        
        // Get categories with counts
        const categories = [];
        const catMap = {};
        allPublications.forEach(p => {
            if (p.category) {
                catMap[p.category] = (catMap[p.category] || 0) + 1;
            }
        });
        Object.entries(catMap).forEach(([name, count]) => {
            categories.push({ name, count });
        });
        
        // Get tags
        const tags = await Post.getTags();
        
        // Get popular posts
        const popularPosts = await Post.getPopular(5);
        
        // Get years available
        const years = [];
        const yearSet = new Set();
        allPublications.forEach(p => {
            if (p.published_date) {
                const pubYear = new Date(p.published_date).getFullYear();
                yearSet.add(pubYear);
            }
        });
        Array.from(yearSet).sort((a, b) => b - a).forEach(y => years.push(y));
        
        // Format publications with dates
        const formattedPublications = publications.map(p => ({
            ...p,
            published_date: p.published_date ? formatDate(p.published_date, 'MMM D, YYYY') : 'No date',
            authors: p.authors || ['Unknown Author']
        }));
        
        // Pagination
        const totalItems = formattedPublications.length;
        const start = (page - 1) * limit;
        const end = start + limit;
        const pageItems = formattedPublications.slice(start, end);
        const totalPagesCalc = Math.ceil(totalItems / limit);
        
        const pagination = {
            currentPage: page,
            totalPages: totalPagesCalc,
            totalItems: totalItems,
            hasNext: page < totalPagesCalc,
            hasPrev: page > 1,
            baseUrl: '/publications?'
        };
        
        res.render('pages/publications', {
            title: 'Publications',
            currentPage: 'publications',
            pageStyles: 'publications',
            metaDescription: 'Browse peer-reviewed research, clinical studies, and review articles from our global network of researchers.',
            publications: pageItems,
            categories,
            tags,
            popularPosts,
            years,
            pagination,
            currentCategory: category,
            currentYear: year,
            currentSearch: search,
            canonicalUrl: buildUrl('/publications'),
            ogTitle: 'Publications - Pharmis Optimus Nexus',
            ogDescription: 'Peer-reviewed research and review articles from pharmaceutical experts.'
        });
    } catch (error) {
        console.error('Error in getPublications:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            error: {
                message: 'Failed to load publications',
                status: 500
            }
        });
    }
};

// src/controllers/publicationsController.js - Updated getPublication

exports.getPublication = async (req, res) => {
    try {
        const { slug } = req.params;
        
        console.log(`🔍 Looking for publication with slug: ${slug}`);
        
        // Find post
        const post = await Post.findBySlug(slug);
        
        if (!post) {
            console.log(`❌ Publication not found: ${slug}`);
            return res.status(404).render('pages/error', {
                title: '404 - Publication Not Found',
                currentPage: 'error',
                error: {
                    message: 'The publication you are looking for does not exist.',
                    status: 404
                }
            });
        }
        
        console.log(`✅ Found publication: ${post.title}`);
        
        // Check if it's a publication
        const publicationCategories = ['Review Articles', 'AI & Biotechnology', 'Research Articles', 'Others'];
        const isPublication = post.category && publicationCategories.includes(post.category);
        
        if (!isPublication) {
            console.log(`🔄 Redirecting to blog: ${slug}`);
            return res.redirect(`/blog/${slug}`);
        }
        
        // Increment view count
        await Post.incrementViews(post.id);
        
        // Get comments
        const commentResult = await Comment.getByPost(post.id, 1, 10);
        
        // Get related publications
        const relatedPublications = await Post.getRelated(post.id, post.category, 3);
        
        // Get categories and tags for sidebar
        const categories = [];
        const allResult = await Post.findAll({ limit: 1000 });
        const allPublications = allResult.posts.filter(p => 
            p.category && publicationCategories.includes(p.category)
        );
        const catMap = {};
        allPublications.forEach(p => {
            if (p.category) {
                catMap[p.category] = (catMap[p.category] || 0) + 1;
            }
        });
        Object.entries(catMap).forEach(([name, count]) => {
            categories.push({ name, count });
        });
        
        const tags = await Post.getTags();
        const popularPosts = await Post.getPopular(5);
        
        // Parse content if it's JSON
        let content = post.content;
        if (typeof content === 'string') {
            try {
                content = JSON.parse(content);
            } catch (e) {
                console.log('⚠️ Content is not valid JSON, keeping as string');
            }
        }
        
        const postData = {
            ...post,
            content,
            published_date: post.published_date ? formatDate(post.published_date, 'MMMM D, YYYY') : 'No date',
            excerpt: post.excerpt || '',
            authors: post.authors || ['Unknown Author']
        };
        
        const postUrl = buildUrl(`/publications/${slug}`);
        
        console.log(`✅ Rendering publication: ${post.title}`);
        
        res.render('pages/publication', {
            title: post.title,
            pageStyles: 'publication',
            currentPage: 'publications',
            metaDescription: generateMetaDescription(post),
            // ✅ These are the variables that hero-mini needs
            subtitle: null, // No subtitle for publications
            date: postData.published_date,
            authors: post.authors || ['Pharmis Optimus Nexus'],
            readTime: post.read_time || '5 min',
            // ✅ Publication data
            publication: postData,
            comments: commentResult.comments || [],
            relatedPublications: relatedPublications || [],
            categories: categories || [],
            tags: tags || [],
            popularPosts: popularPosts || [],
            canonicalUrl: postUrl,
            ogTitle: post.title,
            ogDescription: post.excerpt || '',
            ogType: 'article',
            ogUrl: postUrl,
            ogImage: post.image_url || '/images/og-image.jpg',
            structuredData: {
                "@context": "https://schema.org",
                "@type": "ScholarlyArticle",
                "headline": post.title,
                "description": post.excerpt,
                "datePublished": post.published_date,
                "dateModified": post.updated_at,
                "author": {
                    "@type": "Person",
                    "name": post.authors && post.authors.length ? post.authors[0] : 'Pharmis Optimus Nexus'
                },
                "publisher": {
                    "@type": "Organization",
                    "name": "Pharmis Optimus Nexus"
                },
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": postUrl
                }
            }
        });
    } catch (error) {
        console.error('❌ Error in getPublication:', error);
        console.error('Stack:', error.stack);
        res.status(500).render('pages/error', {
            title: 'Error',
            currentPage: 'error',
            error: {
                message: 'Failed to load publication',
                status: 500,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};