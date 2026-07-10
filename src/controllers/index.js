// src/controllers/index.js
const homeController = require('./homeController');
const blogController = require('./blogController');
const publicationsController = require('./publicationsController');
const apiController = require('./apiController');
const adminController = require('./adminController');
const sitemapController = require('./sitemapController');

module.exports = {
    homeController,
    blogController,
    publicationsController,
    apiController,
    adminController,
    sitemapController
};