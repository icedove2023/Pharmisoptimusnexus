// src/controllers/publicationsController.js
const { Post, Comment, Engagement } = require('../models');
const PublicationDetails = require('../models/PublicationDetails');
const { formatDate, truncate, generateMetaDescription, buildUrl } = require('../utils/helpers');
const { normalizeContent } = require('../utils/contentBlocks');
const { buildCitation } = require('../utils/citation');
const { toBibTeX, toRIS } = require('../utils/exportFormats');
const config = require('../config');

/**
 * Publications listing page
 */
exports.getPublications = async (req, res) => {
    try {
        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = 6;
        const category = req.query.category || null;
        const search = req.query.search || null;
        const year = parseInt(req.query.year, 10) || null;

        // Everything is filtered in the database, so pagination and counts agree.
        const [result, categories, tags, popularPosts, years] = await Promise.all([
            Post.findAll({ kind: 'publication', page, limit, category, search, year }),
            Post.getCategories({ kind: 'publication' }),
            Post.getTags({ kind: 'publication' }),
            Post.getPopular(5, { kind: 'publication' }),
            Post.getYears({ kind: 'publication' })
        ]);

        const detailsByPost = await PublicationDetails.getByPostIds(result.posts.map((p) => p.id));

        const publications = result.posts.map((p) => {
            const details = detailsByPost.get(p.id) || null;
            return {
                ...p,
                published_date: p.published_date ? formatDate(p.published_date, 'MMM D, YYYY') : 'No date',
                authors: p.authors || ['Unknown Author'],
                abstract: (details && details.abstract) || p.excerpt || '',
                doi: details && details.doi,
                volume: details && details.volume,
                issue: details && details.issue,
                articleType: details && details.article_type,
                authorList: (details && details.author_list) || null
            };
        });

        const pagination = {
            currentPage: page,
            totalPages: result.totalPages,
            totalItems: result.total,
            hasNext: result.hasNext,
            hasPrev: result.hasPrev,
            baseUrl: '/publications?'
        };

        res.render('pages/publications', {
            title: 'Publications',
            currentPage: 'publications',
            pageStyles: 'publications',
            metaDescription: 'Browse peer-reviewed research, clinical studies, and review articles from our global network of researchers.',
            publications,
            categories,
            tags,
            popularPosts,
            years,
            pagination,
            currentCategory: category,
            currentYear: year ? String(year) : null,
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
        
        // Find post
        const post = await Post.findBySlug(slug);
        
        if (!post) {
            return res.status(404).render('pages/error', {
                title: '404 - Publication Not Found',
                currentPage: 'error',
                error: {
                    message: 'The publication you are looking for does not exist.',
                    status: 404
                }
            });
        }
        
        // Blogs live under /blog
        if (post.kind !== 'publication') {
            return res.redirect(`/blog/${slug}`);
        }

        // Views are counted by the browser (public/js/engagement.js).
        const liked = await Engagement.hasLiked(post.id, req.visitorHash);

        // Get comments
        const commentResult = await Comment.getByPost(post.id, 1, 10);
        
        // Get related publications
        const relatedPublications = await Post.getRelated(post.id, post.category, 3, 'publication');
        
        // Categories, tags, popular items and this publication's journal details
        const [categories, tags, popularPosts, details] = await Promise.all([
            Post.getCategories({ kind: 'publication' }),
            Post.getTags({ kind: 'publication' }),
            Post.getPopular(5, { kind: 'publication' }),
            PublicationDetails.getByPostId(post.id)
        ]);

        // Re-validate and sanitize the stored content on every render, the
        // same as blog posts - this also upgrades older plain-text content
        // into the current block shape.
        const content = normalizeContent(post.content).content;

        const postData = {
            ...post,
            content,
            published_date: post.published_date ? formatDate(post.published_date, 'MMMM D, YYYY') : 'No date',
            excerpt: post.excerpt || '',
            authors: post.authors || ['Unknown Author']
        };

        const postUrl = buildUrl(`/publications/${slug}`);
        const journalName = 'Pharmis Optimus Nexus';
        const citation = buildCitation({ post, details, journalName });

        res.render('pages/publication', {
            title: post.title,
            liked,
            pageStyles: 'publication',
            currentPage: 'publications',
            metaDescription: generateMetaDescription(post),
            // Publication data
            publication: postData,
            details: details || {},
            citation,
            journalName,
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
                "author": (details && details.author_list && details.author_list.length
                    ? details.author_list.map((a) => ({ "@type": "Person", "name": a.name }))
                    : { "@type": "Person", "name": post.authors && post.authors.length ? post.authors[0] : journalName }),
                "publisher": {
                    "@type": "Organization",
                    "name": journalName
                },
                "mainEntityOfPage": {
                    "@type": "WebPage",
                    "@id": postUrl
                }
            }
        });
    } catch (error) {
        console.error('Error in getPublication:', error);
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
// ------------------------------------------------------------
// Citation export (BibTeX / RIS). Only for published publications - same
// visibility rule as the article page itself.
// ------------------------------------------------------------

async function loadPublishedPublication(slug) {
    const post = await Post.findBySlug(slug);
    if (!post || post.kind !== 'publication') return null;
    const details = await PublicationDetails.getByPostId(post.id);
    return { post, details };
}

exports.getCitationBibTeX = async (req, res) => {
    try {
        const found = await loadPublishedPublication(req.params.slug);
        if (!found) {
            return res.status(404).send('Publication not found.');
        }
        const journalName = 'Pharmis Optimus Nexus';
        const url = buildUrl(`/publications/${req.params.slug}`);
        const bib = toBibTeX({ post: found.post, details: found.details, journalName, url });

        res.set('Content-Type', 'application/x-bibtex; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="${req.params.slug}.bib"`);
        res.send(bib);
    } catch (error) {
        console.error('Error in getCitationBibTeX:', error);
        res.status(500).send('Could not generate the citation file.');
    }
};

exports.getCitationRIS = async (req, res) => {
    try {
        const found = await loadPublishedPublication(req.params.slug);
        if (!found) {
            return res.status(404).send('Publication not found.');
        }
        const journalName = 'Pharmis Optimus Nexus';
        const url = buildUrl(`/publications/${req.params.slug}`);
        const ris = toRIS({ post: found.post, details: found.details, journalName, url });

        res.set('Content-Type', 'application/x-research-info-systems; charset=utf-8');
        res.set('Content-Disposition', `attachment; filename="${req.params.slug}.ris"`);
        res.send(ris);
    } catch (error) {
        console.error('Error in getCitationRIS:', error);
        res.status(500).send('Could not generate the citation file.');
    }
};
