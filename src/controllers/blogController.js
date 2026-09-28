// src/controllers/blogController.js
const { Post, Comment, Engagement } = require('../models');
const { formatDate, truncate, generateMetaDescription, buildUrl, toJSON } = require('../utils/helpers');
const { normalizeContent } = require('../utils/contentBlocks');
const config = require('../config');

/**
 * Blog listing page
 */
exports.getBlog = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 6;
        const category = req.query.category || null;
        const tag = req.query.tag || null;
        const search = req.query.search || null;
        
        // Fetch posts
        const result = await Post.findAll({
            kind: 'blog',
            page,
            limit,
            category,
            tag,
            search
        });
        
        // Get featured post
        const featured = await Post.findFeatured({ kind: 'blog' });
        
        // Get categories with counts
        const categories = await Post.getCategories({ kind: 'blog' });
        
        // Get all tags
        const tags = await Post.getTags({ kind: 'blog' });
        
        // Get popular posts
        const popularPosts = await Post.getPopular(5, { kind: 'blog' });
        
        // Format pagination
        const pagination = {
            currentPage: page,
            totalPages: result.totalPages,
            totalItems: result.total,
            hasNext: result.hasNext,
            hasPrev: result.hasPrev,
            baseUrl: '/blog?'
        };
        
        // Format posts with dates
        const formattedPosts = result.posts.map(post => ({
            ...post,
            published_date: post.published_date ? formatDate(post.published_date, 'MMM D, YYYY') : 'No date'
        }));
        
        // Format featured post
        let formattedFeatured = null;
        if (featured) {
            formattedFeatured = {
                ...featured,
                published_date: featured.published_date ? formatDate(featured.published_date, 'MMMM D, YYYY') : 'No date'
            };
        }
        
        res.render('pages/blog', {
            title: 'Blog',
            currentPage: 'blog',
            pageStyles: 'blog',
            metaDescription: 'Insights, perspectives, and commentary from leaders in pharmaceutical research and innovation.',
            posts: formattedPosts,
            featured: formattedFeatured,
            categories,
            tags,
            popularPosts,
            pagination,
            currentCategory: category,
            currentTag: tag,
            currentSearch: search,
            canonicalUrl: buildUrl('/blog'),
            ogTitle: 'Blog - Pharmis Optimus Nexus',
            ogDescription: 'Insights and perspectives from pharmaceutical research and innovation.'
        });
    } catch (error) {
        console.error('Error in getBlog:', error);
        res.status(500).render('pages/error', {
            title: 'Error',
            error: {
                message: 'Failed to load blog posts',
                status: 500
            }
        });
    }
};

/**
 * Single blog post
 */
// src/controllers/blogController.js - Updated getBlogPost

exports.getBlogPost = async (req, res) => {
    try {
        const { slug } = req.params;
        
        // Find post
        const post = await Post.findBySlug(slug);
        
        if (!post) {
            return res.status(404).render('pages/error', {
                title: '404 - Post Not Found',
                currentPage: 'error',
                error: {
                    message: 'The blog post you are looking for does not exist.',
                    status: 404
                }
            });
        }
        
        // Publications live under /publications
        if (post.kind !== 'blog') {
            return res.redirect(`/publications/${slug}`);
        }

        // Views are counted by the browser (public/js/engagement.js), not here,
        // so refreshes and crawlers do not inflate the number.
        const liked = await Engagement.hasLiked(post.id, req.visitorHash);

        // Re-validate and sanitize the stored content on every render. This
        // also upgrades older posts (plain `text` fields, no `html`) into the
        // same shape new posts are saved in, so both render identically.
        post.content = normalizeContent(post.content).content;

        // Get comments
        const commentResult = await Comment.getByPost(post.id, 1, 10);
        
        // Get related posts
        const relatedPosts = await Post.getRelated(post.id, post.category, 3, 'blog');
        
        // Get categories and tags for sidebar
        const categories = await Post.getCategories({ kind: 'blog' });
        const tags = await Post.getTags({ kind: 'blog' });
        const popularPosts = await Post.getPopular(5, { kind: 'blog' });
        
        // Parse content if it's JSON
        let content = post.content;
        if (typeof content === 'string') {
            try {
                content = JSON.parse(content);
            } catch (e) {
            }
        }
        
        const postData = {
            ...post,
            content,
            published_date: post.published_date ? formatDate(post.published_date, 'MMMM D, YYYY') : 'No date',
            excerpt: post.excerpt || ''
        };
        
        const postUrl = buildUrl(`/blog/${slug}`);
        
        res.render('pages/blog-post', {
            title: post.title,
            liked,
            pageStyles: 'blog-post',
            currentPage: 'blog',
            metaDescription: generateMetaDescription(post),
            // These are the variables that hero-mini needs
            subtitle: null, // No subtitle for blog posts
            date: postData.published_date,
            authors: post.authors || ['Pharmis Optimus Nexus'],
            readTime: post.read_time || '5 min',
            // Post data
            post: postData,
            comments: commentResult.comments || [],
            relatedPosts: relatedPosts || [],
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
                "@type": "BlogPosting",
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
                    "name": "Pharmis Optimus Nexus",
                    "logo": {
                        "@type": "ImageObject",
                        "url": `${config.baseUrl}/images/Classlogo.png`
                    }
                },
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": postUrl
                }
            }
        });
    } catch (error) {
        console.error('Error in getBlogPost:', error);
        console.error('Stack:', error.stack);
        res.status(500).render('pages/error', {
            title: 'Error',
            currentPage: 'error',
            error: {
                message: 'Failed to load blog post',
                status: 500,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            }
        });
    }
};