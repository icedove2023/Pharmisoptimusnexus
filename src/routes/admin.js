// src/routes/admin.js
// Mounted at config.adminPath in server.js. Nothing on the public site links
// here: admins open the address directly.

const express = require('express');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const config = require('../config');
const admin = require('../controllers/adminController');
const siteContent = require('../controllers/siteContentController');
const { adminHeaders, sameOriginGuard, adminGuard } = require('../middleware/adminSession');
const { ADMIN_ROLES, EDITOR_ROLES } = require('../middleware/auth');
const { extensionFor, documentExtensionFor, MAX_FILE_BYTES, MAX_DOCUMENT_BYTES } = require('../utils/media');

const router = express.Router();
const adminPath = config.adminPath;
const isProduction = config.nodeEnv === 'production';

const editors = adminGuard({ adminPath, isProduction, roles: EDITOR_ROLES });
const adminsOnly = adminGuard({ adminPath, isProduction, roles: ADMIN_ROLES });

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
        cb(null, Boolean(extensionFor(file.mimetype)));
    }
});

const uploadPdf = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_DOCUMENT_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
        cb(null, Boolean(documentExtensionFor(file.mimetype)));
    }
});

// Only failed sign-ins count towards the limit.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 8,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).render('admin/login', {
            title: 'Sign in',
            bare: true,
            error: 'Too many attempts. Wait a few minutes and try again.'
        });
    }
});

router.use(adminHeaders({ adminPath }));

// Sign in and out
router.get('/login', admin.getLogin);
router.post('/login', sameOriginGuard, loginLimiter, admin.postLogin);
router.post('/logout', sameOriginGuard, admin.postLogout);

// Admin and editor
router.get('/', editors, admin.getDashboard);
router.get('/posts', editors, admin.getPosts);
router.post('/posts/:id/status', sameOriginGuard, editors, admin.postPostStatus);

router.get('/posts/new', editors, admin.getNewPost);
router.post('/posts', sameOriginGuard, editors, admin.postCreatePost);
router.get('/posts/:id/edit', editors, admin.getEditPost);
router.post('/posts/:id', sameOriginGuard, editors, admin.postUpdatePost);
router.post('/posts/:id/autosave', sameOriginGuard, editors, admin.postAutosave);
router.post('/posts/:id/autosave/discard', sameOriginGuard, editors, admin.postDiscardAutosave);
router.get('/posts/:id/revisions/:revId/diff', editors, admin.getRevisionDiff);

router.get('/media', editors, admin.getMediaLibrary);
router.get('/media/:id', editors, admin.getMediaAsset);
router.delete('/media/:id', sameOriginGuard, editors, admin.deleteMediaAsset);
router.post('/media', sameOriginGuard, editors, (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ success: false, error: 'That file is too large (8 MB maximum).' });
        }
        if (err) {
            return res.status(400).json({ success: false, error: 'That file could not be uploaded.' });
        }
        return next();
    });
}, admin.postUploadMedia);

// Publications (Phase 3): same block content as blog posts, plus journal
// metadata in publication_details.
router.get('/publications/new', editors, admin.getNewPublication);
router.post('/publications', sameOriginGuard, editors, admin.postCreatePublication);
router.get('/publications/:id/edit', editors, admin.getEditPublication);
router.post('/publications/:id', sameOriginGuard, editors, admin.postUpdatePublication);
router.post('/publications/:id/autosave', sameOriginGuard, editors, admin.postAutosave);
router.post('/publications/:id/autosave/discard', sameOriginGuard, editors, admin.postDiscardAutosave);
router.get('/publications/:id/revisions/:revId/diff', editors, admin.getRevisionDiff);

router.post('/media/pdf', sameOriginGuard, editors, (req, res, next) => {
    uploadPdf.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ success: false, error: 'That file is too large (20 MB maximum).' });
        }
        if (err) {
            return res.status(400).json({ success: false, error: 'Only PDF files are accepted.' });
        }
        return next();
    });
}, admin.postUploadPdf);

// Admin only
router.get('/messages', adminsOnly, admin.getMessages);
router.post('/messages/:id/status', sameOriginGuard, adminsOnly, admin.postMessageStatus);

// Site content (Phase 4): hero slideshow and About page team/officials.
// Structural/branding content, so admin-only rather than editors too.
router.get('/slides', adminsOnly, siteContent.getSlides);
router.post('/slides', sameOriginGuard, adminsOnly, siteContent.postCreateSlide);
router.post('/slides/:id', sameOriginGuard, adminsOnly, siteContent.postUpdateSlide);
router.post('/slides/:id/delete', sameOriginGuard, adminsOnly, siteContent.postDeleteSlide);
router.post('/slides/:id/move', sameOriginGuard, adminsOnly, siteContent.postMoveSlide);

router.get('/team', adminsOnly, siteContent.getTeam);
router.post('/team', sameOriginGuard, adminsOnly, siteContent.postCreateMember);
router.post('/team/:id', sameOriginGuard, adminsOnly, siteContent.postUpdateMember);
router.post('/team/:id/delete', sameOriginGuard, adminsOnly, siteContent.postDeleteMember);
router.post('/team/:id/move', sameOriginGuard, adminsOnly, siteContent.postMoveMember);

module.exports = router;
