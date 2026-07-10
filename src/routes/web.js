// src/routes/web.js
const express = require('express');
const router = express.Router();
const { homeController, blogController, publicationsController, sitemapController } = require('../controllers');

// ============================================================
// HOME ROUTES
// ============================================================
router.get('/', homeController.getHome);
router.get('/about', homeController.getAbout);
router.get('/contact', homeController.getContact);

// ============================================================
// BLOG ROUTES
// ============================================================
router.get('/blog', blogController.getBlog);
router.get('/blog/:slug', blogController.getBlogPost);

// ============================================================
// PUBLICATION ROUTES
// ============================================================
router.get('/publications', publicationsController.getPublications);
router.get('/publications/:slug', publicationsController.getPublication);

// ============================================================
// SITEMAP & SEO
// ============================================================
router.get('/sitemap.xml', sitemapController.generateSitemap);
router.get('/robots.txt', homeController.getRobots);

         

module.exports = router;