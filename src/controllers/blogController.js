// src/controllers/blogController.js
const { Post, Comment } = require('../models');
const { formatDate, truncate, generateMetaDescription, buildUrl, toJSON } = require('../utils/helpers');
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
            page,
            limit,
            category,
            tag,
            search
        });
        
        // Get featured post
        const featured = await Post.findFeatured();
        
        // Get categories with counts
        const categories = await Post.getCategories();
        
        // Get all tags
        const tags = await Post.getTags();
        
        // Get popular posts
        const popularPosts = await Post.getPopular(5);
        
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
        
        console.log(`🔍 Looking for blog post with slug: ${slug}`);
        
        // Find post
        const post = await Post.findBySlug(slug);
        
        if (!post) {
            console.log(`❌ Blog post not found: ${slug}`);
            return res.status(404).render('pages/error', {
                title: '404 - Post Not Found',
                currentPage: 'error',
                error: {
                    message: 'The blog post you are looking for does not exist.',
                    status: 404
                }
            });
        }
        
        console.log(`✅ Found blog post: ${post.title}`);
        
        // Check if it's a blog post (not publication)
        const publicationCategories = ['Review Articles', 'AI & Biotechnology', 'Research Articles', 'Others'];
        const isBlog = post.category && !publicationCategories.includes(post.category);
        
        if (!isBlog) {
            console.log(`🔄 Redirecting to publications: ${slug}`);
            return res.redirect(`/publications/${slug}`);
        }
        
        // Increment view count
        await Post.incrementViews(post.id);
        
        // Get comments
        const commentResult = await Comment.getByPost(post.id, 1, 10);
        
        // Get related posts
        const relatedPosts = await Post.getRelated(post.id, post.category, 3);
        
        // Get categories and tags for sidebar
        const categories = await Post.getCategories();
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
            excerpt: post.excerpt || ''
        };
        
        const postUrl = buildUrl(`/blog/${slug}`);
        
        console.log(`✅ Rendering blog post: ${post.title}`);
        
        res.render('pages/blog-post', {
            title: post.title,
            pageStyles: 'blog-post',
            currentPage: 'blog',
            metaDescription: generateMetaDescription(post),
            // ✅ These are the variables that hero-mini needs
            subtitle: null, // No subtitle for blog posts
            date: postData.published_date,
            authors: post.authors || ['Pharmis Optimus Nexus'],
            readTime: post.read_time || '5 min',
            // ✅ Post data
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
        console.error('❌ Error in getBlogPost:', error);
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