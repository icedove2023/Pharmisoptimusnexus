// src/controllers/adminController.js
// Admin area: sign-in, overview, posts list and contact inbox.
// Access control lives in middleware/adminSession.js and routes/admin.js.

const config = require('../config');
const { Post, ContactMessage } = require('../models');
const AdminStats = require('../models/AdminStats');
const { supabaseAdmin, createAuthClient } = require('../config/supabase');
const { setSessionCookies, clearSessionCookies, ACCESS_COOKIE } = require('../middleware/adminSession');
const { roleOf, EDITOR_ROLES } = require('../middleware/auth');
const { parseCookies } = require('../utils/cookies');
const { isUuid } = require('../utils/request');
const { normalizeContent, estimateReadTime } = require('../utils/contentBlocks');
const { diffSnapshots } = require('../utils/snapshotDiff');
const { parsePostForm } = require('../utils/postForm');
const { parsePublicationForm, ARTICLE_TYPES, LICENSES } = require('../utils/publicationForm');
const PublicationDetails = require('../models/PublicationDetails');
const PostRevision = require('../models/PostRevision');
const PostAutosave = require('../models/PostAutosave');
const { generateSlug, ensureUniqueSlug } = require('../utils/slugify');
const { toPlainText } = require('../utils/richText');
const { extensionFor, documentExtensionFor, buildStoragePath, MAX_FILE_BYTES, MAX_DOCUMENT_BYTES, BUCKET } = require('../utils/media');

const adminPath = config.adminPath;
const cookieCtx = { adminPath, isProduction: config.nodeEnv === 'production' };
const SIGN_IN_FAILED = 'That email and password did not work.';

function renderLogin(res, status, error) {
    return res.status(status).render('admin/login', { title: 'Sign in', bare: true, error });
}

function showError(res, status, message) {
    return res.status(status).render('admin/error', { title: 'Something went wrong', heading: 'Something went wrong', message });
}

// Only allow returning to a path inside the given admin section.
function safeReturn(value, section) {
    const prefix = `${adminPath}/${section}`;
    const target = String(value || '');
    const ok = target.startsWith(prefix) && !target.includes('//') && !target.includes('\\') && !target.includes('\n');
    return ok ? target : prefix;
}

// ------------------------------------------------------------
// Sign in and out
// ------------------------------------------------------------

exports.getLogin = (req, res) => {
    renderLogin(res, 200, null);
};

exports.postLogin = async (req, res) => {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase().slice(0, 254);
    const password = String((req.body && req.body.password) || '').slice(0, 200);

    if (!email || !password) {
        return renderLogin(res, 400, 'Enter your email and password.');
    }

    try {
        const { data, error } = await createAuthClient().auth.signInWithPassword({ email, password });
        if (error || !data || !data.session) {
            return renderLogin(res, 401, SIGN_IN_FAILED);
        }

        // Valid Supabase account but no admin or editor role: treated exactly
        // like a wrong password, and the token is revoked straight away.
        if (!EDITOR_ROLES.includes(roleOf(data.user))) {
            try {
                await supabaseAdmin.auth.admin.signOut(data.session.access_token);
            } catch (err) {
                // Best effort only.
            }
            return renderLogin(res, 401, SIGN_IN_FAILED);
        }

        setSessionCookies(res, data.session, cookieCtx);
        return res.redirect(303, adminPath);
    } catch (err) {
        console.error('Admin sign-in failed:', err.message);
        return renderLogin(res, 503, 'Sign-in is unavailable right now. Try again shortly.');
    }
};

exports.postLogout = async (req, res) => {
    const token = parseCookies(req.headers.cookie)[ACCESS_COOKIE];
    if (token) {
        try {
            await supabaseAdmin.auth.admin.signOut(token);
        } catch (err) {
            // Cookies are cleared below either way.
        }
    }
    clearSessionCookies(res, cookieCtx);
    return res.redirect(303, `${adminPath}/login`);
};

// ------------------------------------------------------------
// Overview
// ------------------------------------------------------------

exports.getDashboard = async (req, res) => {
    try {
        const isAdmin = req.admin.role === 'admin';
        const [stats, recent, inbox] = await Promise.all([
            AdminStats.getOverview(),
            Post.adminList({ limit: 5 }),
            isAdmin ? ContactMessage.list({ status: 'new', limit: 5 }) : Promise.resolve({ messages: [] })
        ]);

        res.render('admin/dashboard', {
            title: 'Overview',
            section: 'overview',
            stats,
            recentPosts: recent.posts,
            recentMessages: inbox.messages
        });
    } catch (error) {
        console.error('Admin dashboard failed:', error);
        showError(res, 500, 'The overview could not be loaded. Check that the Phase 1 database migration has been run.');
    }
};

// ------------------------------------------------------------
// Posts
// ------------------------------------------------------------

exports.getPosts = async (req, res) => {
    const kind = Post.KINDS.includes(req.query.kind) ? req.query.kind : null;
    const status = Post.STATUSES.includes(req.query.status) ? req.query.status : null;
    const search = String(req.query.search || '').slice(0, 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    try {
        const result = await Post.adminList({ kind, status, search, page, limit: 20 });

        const params = new URLSearchParams();
        if (kind) params.set('kind', kind);
        if (status) params.set('status', status);
        if (search) params.set('search', search);
        const baseQuery = params.toString();
        if (page > 1) params.set('page', String(page));
        const returnTo = `${adminPath}/posts${params.toString() ? '?' + params.toString() : ''}`;

        res.render('admin/posts', {
            title: kind === 'publication' ? 'Publications' : kind === 'blog' ? 'Blog posts' : 'All posts',
            section: kind === 'publication' ? 'publications' : kind === 'blog' ? 'blog' : 'posts',
            result,
            filters: { kind, status, search },
            statuses: Post.STATUSES,
            baseQuery,
            returnTo
        });
    } catch (error) {
        console.error('Admin posts list failed:', error);
        showError(res, 500, 'Posts could not be loaded. Check that the Phase 1 database migration has been run.');
    }
};

exports.postPostStatus = async (req, res) => {
    const { id } = req.params;
    const status = req.body && req.body.status;

    if (!isUuid(id) || !Post.STATUSES.includes(status)) {
        return showError(res, 400, 'That change was not valid.');
    }

    try {
        const updated = await Post.setStatus(id, status, req.admin.id);
        if (!updated) {
            return showError(res, 404, 'That post no longer exists.');
        }
        return res.redirect(303, safeReturn(req.body.returnTo, 'posts'));
    } catch (error) {
        console.error('Admin status change failed:', error);
        return showError(res, 500, 'The status could not be changed.');
    }
};

// ------------------------------------------------------------
// Contact messages (admin only)
// ------------------------------------------------------------

exports.getMessages = async (req, res) => {
    const status = ContactMessage.STATUSES.includes(req.query.status) ? req.query.status : null;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);

    try {
        const result = await ContactMessage.list({ status, page, limit: 20 });

        const params = new URLSearchParams();
        if (status) params.set('status', status);
        const baseQuery = params.toString();
        if (page > 1) params.set('page', String(page));
        const returnTo = `${adminPath}/messages${params.toString() ? '?' + params.toString() : ''}`;

        res.render('admin/messages', {
            title: 'Messages',
            section: 'messages',
            result,
            filters: { status },
            baseQuery,
            returnTo
        });
    } catch (error) {
        console.error('Admin messages failed:', error);
        showError(res, 500, 'Messages could not be loaded. Check that the Phase 1 database migration has been run.');
    }
};

exports.postMessageStatus = async (req, res) => {
    const { id } = req.params;
    const status = req.body && req.body.status;

    if (!isUuid(id) || !ContactMessage.STATUSES.includes(status)) {
        return showError(res, 400, 'That change was not valid.');
    }

    try {
        const updated = await ContactMessage.setStatus(id, status);
        if (!updated) {
            return showError(res, 404, 'That message no longer exists.');
        }
        return res.redirect(303, safeReturn(req.body.returnTo, 'messages'));
    } catch (error) {
        console.error('Admin message status failed:', error);
        return showError(res, 500, 'The message could not be updated.');
    }
};

exports.safeReturn = safeReturn;

// ------------------------------------------------------------
// Blog post editor (Phase 2). Publications get their own fields in Phase 3;
// for now this editor only handles kind === 'blog'.
// ------------------------------------------------------------

function editorLocals(overrides = {}) {
    return {
        title: overrides.post ? 'Edit post' : 'New post',
        section: 'blog',
        statuses: Post.STATUSES,
        errors: [],
        post: null,
        values: {
            title: '', excerpt: '', category: '', tags: '', authors: '',
            status: 'draft', published_date: '', scheduled_for: '', read_time: '',
            image_url: '', caption: '', slug: ''
        },
        contentJson: '{"sections":[]}',
        saved: false,
        ...overrides
    };
}

function valuesFromPost(post) {
    return {
        title: post.title || '',
        excerpt: post.excerpt || '',
        category: post.category || '',
        tags: Array.isArray(post.tags) ? post.tags.join(', ') : '',
        authors: Array.isArray(post.authors) ? post.authors.join(', ') : '',
        status: post.status || 'draft',
        published_date: post.published_date ? String(post.published_date).slice(0, 10) : '',
        scheduled_for: post.scheduled_for ? String(post.scheduled_for).slice(0, 16) : '',
        read_time: post.read_time || '',
        image_url: post.image_url || '',
        caption: post.caption || '',
        slug: post.slug || ''
    };
}

/**
 * Pull the post-level editor fields out of a body-shaped object as raw
 * strings, exactly as the form itself submits them. Used both to redisplay
 * a form after a validation error and to rehydrate the editor from a stored
 * revision or autosave snapshot - both of those are saved as the literal
 * request body, so this one mapping works for every source.
 */
function rawPostInput(body) {
    return {
        title: body.title || '', excerpt: body.excerpt || '', category: body.category || '',
        tags: body.tags || '', authors: body.authors || '', status: body.status || 'draft',
        published_date: body.published_date || '', scheduled_for: body.scheduled_for || '',
        read_time: body.read_time || '', image_url: body.image_url || '', caption: body.caption || '',
        slug: body.slug || ''
    };
}

/**
 * Load revision/autosave state for the editor sidebar, and resolve which
 * snapshot (if any) the query string asks to view: ?restoreRevision=<id> or
 * ?restoreAutosave=1. Shared by the blog and publication edit screens since
 * the logic doesn't depend on which kind of post this is.
 */
async function loadEditorHistory(postId, query) {
    const [revisions, autosave] = await Promise.all([
        PostRevision.list(postId),
        PostAutosave.get(postId)
    ]);

    let restored = null;
    if (query.restoreRevision && isUuid(query.restoreRevision)) {
        const revision = await PostRevision.get(postId, query.restoreRevision);
        if (revision) {
            restored = { snapshot: revision.snapshot, timestamp: revision.created_at };
        }
    } else if (query.restoreAutosave === '1' && autosave) {
        restored = { snapshot: autosave.snapshot, timestamp: autosave.updated_at };
    }

    return {
        revisions,
        autosaveAvailable: !restored && autosave ? autosave.updated_at : null,
        restored
    };
}

exports.getNewPost = async (req, res) => {
    const categories = await Post.getCategories({ kind: 'blog' });
    res.render('admin/post-editor', editorLocals({ categories }));
};

exports.postCreatePost = async (req, res) => {
    const { errors, values } = parsePostForm(req.body);
    const { content, dropped, error: contentError } = normalizeContent(req.body.content);
    if (contentError) errors.push(`Content could not be read: ${contentError}`);

    if (errors.length) {
        const categories = await Post.getCategories({ kind: 'blog' });
        return res.status(400).render('admin/post-editor', editorLocals({
            errors,
            categories,
            values: rawPostInput(req.body),
            contentJson: JSON.stringify(content)
        }));
    }

    try {
        const requestedSlug = toPlainText(req.body.slug, 200);
        const baseSlug = generateSlug(requestedSlug) || generateSlug(values.title) || 'post';
        const slug = await ensureUniqueSlug(baseSlug);
        const readTime = values.read_time || estimateReadTime(content.sections);

        const post = await Post.create({
            ...values,
            slug,
            read_time: readTime,
            content,
            content_format: 'sections_v1',
            kind: 'blog',
            author_id: req.admin.id,
            updated_by: req.admin.id
        });

        if (dropped > 0) {
            console.warn(`Post ${post.id}: ${dropped} content block(s) were dropped during validation.`);
        }

        await PostRevision.record(post.id, req.body, req.admin.id);

        return res.redirect(303, `${adminPath}/posts/${post.id}/edit?saved=1`);
    } catch (error) {
        console.error('Admin create post failed:', error);
        const categories = await Post.getCategories({ kind: 'blog' }).catch(() => []);
        return res.status(500).render('admin/post-editor', editorLocals({
            errors: ['The post could not be saved. Check that the Phase 1 database migration has been run.'],
            categories,
            values: rawPostInput(req.body),
            contentJson: JSON.stringify(content)
        }));
    }
};

exports.getEditPost = async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) {
        return showError(res, 404, 'That post could not be found.');
    }

    try {
        const post = await Post.adminFindById(id);
        if (!post) {
            return showError(res, 404, 'That post could not be found.');
        }
        if (post.kind !== 'blog') {
            return res.redirect(303, `${adminPath}/publications/${post.id}/edit`);
        }

        const categories = await Post.getCategories({ kind: 'blog' });
        const history = await loadEditorHistory(id, req.query);

        res.render('admin/post-editor', editorLocals({
            post,
            categories,
            values: history.restored ? rawPostInput(history.restored.snapshot) : valuesFromPost(post),
            contentJson: history.restored
                ? (history.restored.snapshot.content || '{"sections":[]}')
                : JSON.stringify(post.content && post.content.sections ? post.content : { sections: [] }),
            saved: req.query.saved === '1',
            revisions: history.revisions,
            autosaveAvailable: history.autosaveAvailable,
            viewingRevision: history.restored ? history.restored.timestamp : null
        }));
    } catch (error) {
        console.error('Admin edit post load failed:', error);
        showError(res, 500, 'This post could not be loaded.');
    }
};

exports.postUpdatePost = async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) {
        return showError(res, 404, 'That post could not be found.');
    }

    let existing;
    try {
        existing = await Post.adminFindById(id);
    } catch (error) {
        console.error('Admin update post lookup failed:', error);
        return showError(res, 500, 'This post could not be loaded.');
    }
    if (!existing) {
        return showError(res, 404, 'That post could not be found.');
    }
    if (existing.kind !== 'blog') {
        return res.redirect(303, `${adminPath}/publications/${id}/edit`);
    }

    const { errors, values } = parsePostForm(req.body);
    const { content, dropped, error: contentError } = normalizeContent(req.body.content);
    if (contentError) errors.push(`Content could not be read: ${contentError}`);

    if (errors.length) {
        const categories = await Post.getCategories({ kind: 'blog' });
        return res.status(400).render('admin/post-editor', editorLocals({
            post: existing,
            errors,
            categories,
            values: rawPostInput(req.body),
            contentJson: JSON.stringify(content)
        }));
    }

    try {
        const requestedSlug = toPlainText(req.body.slug, 200);
        const baseSlug = generateSlug(requestedSlug) || generateSlug(values.title) || 'post';
        const slug = baseSlug === existing.slug ? existing.slug : await ensureUniqueSlug(baseSlug, id);
        const readTime = values.read_time || estimateReadTime(content.sections);

        await Post.update(id, {
            ...values,
            slug,
            read_time: readTime,
            content,
            updated_by: req.admin.id
        });

        if (dropped > 0) {
            console.warn(`Post ${id}: ${dropped} content block(s) were dropped during validation.`);
        }

        await PostRevision.record(id, req.body, req.admin.id);
        await PostAutosave.clear(id);

        return res.redirect(303, `${adminPath}/posts/${id}/edit?saved=1`);
    } catch (error) {
        console.error('Admin update post failed:', error);
        const categories = await Post.getCategories({ kind: 'blog' }).catch(() => []);
        return res.status(500).render('admin/post-editor', editorLocals({
            post: existing,
            errors: ['The post could not be saved.'],
            categories,
            values: rawPostInput(req.body),
            contentJson: JSON.stringify(content)
        }));
    }
};

// ------------------------------------------------------------
// Publication editor (Phase 3). Shares the same block-based body content as
// blog posts, plus the journal-specific fields in publication_details.
// ------------------------------------------------------------

function pubEditorLocals(overrides = {}) {
    return {
        title: overrides.post ? 'Edit publication' : 'New publication',
        section: 'publications',
        statuses: Post.STATUSES,
        articleTypes: ARTICLE_TYPES,
        licenses: LICENSES,
        errors: [],
        post: null,
        values: {
            title: '', excerpt: '', category: '', tags: '', authors: '',
            status: 'draft', published_date: '', scheduled_for: '', read_time: '',
            image_url: '', caption: '', slug: ''
        },
        detailValues: {
            article_type: '', abstract: '', keywords: '', doi: '', volume: '', issue: '', pages: '',
            received_date: '', accepted_date: '', corresponding_author: '', license: '',
            pdf_url: '', author_list: '', reference_list: ''
        },
        contentJson: '{"sections":[]}',
        saved: false,
        ...overrides
    };
}

function detailValuesFromRecord(details) {
    if (!details) {
        return {
            article_type: '', abstract: '', keywords: '', doi: '', volume: '', issue: '', pages: '',
            received_date: '', accepted_date: '', corresponding_author: '', license: '',
            pdf_url: '', author_list: '', reference_list: ''
        };
    }
    return {
        article_type: details.article_type || '',
        abstract: details.abstract || '',
        keywords: Array.isArray(details.keywords) ? details.keywords.join(', ') : '',
        doi: details.doi || '',
        volume: details.volume || '',
        issue: details.issue || '',
        pages: details.pages || '',
        received_date: details.received_date || '',
        accepted_date: details.accepted_date || '',
        corresponding_author: details.corresponding_author || '',
        license: details.license || '',
        pdf_url: details.pdf_url || '',
        author_list: (details.author_list || []).map((a) => (a.affiliation ? `${a.name} | ${a.affiliation}` : a.name)).join('\n'),
        reference_list: (details.reference_list || []).map((r) => (r.url ? `${r.text} | ${r.url}` : r.text)).join('\n')
    };
}

function rawDetailInput(body) {
    return {
        article_type: body.article_type || '', abstract: body.abstract || '', keywords: body.keywords || '',
        doi: body.doi || '', volume: body.volume || '', issue: body.issue || '', pages: body.pages || '',
        received_date: body.received_date || '', accepted_date: body.accepted_date || '',
        corresponding_author: body.corresponding_author || '', license: body.license || '',
        pdf_url: body.pdf_url || '', author_list: body.author_list || '', reference_list: body.reference_list || ''
    };
}

exports.getNewPublication = async (req, res) => {
    const categories = await Post.getCategories({ kind: 'publication' });
    res.render('admin/publication-editor', pubEditorLocals({ categories }));
};

exports.postCreatePublication = async (req, res) => {
    const { errors: postErrors, values } = parsePostForm(req.body);
    const { errors: detailErrors, values: detailValues } = parsePublicationForm(req.body);
    const { content, dropped, error: contentError } = normalizeContent(req.body.content);
    const errors = [...postErrors, ...detailErrors];
    if (contentError) errors.push(`Content could not be read: ${contentError}`);

    if (errors.length) {
        const categories = await Post.getCategories({ kind: 'publication' });
        return res.status(400).render('admin/publication-editor', pubEditorLocals({
            errors,
            categories,
            values: rawPostInput(req.body),
            detailValues: rawDetailInput(req.body),
            contentJson: JSON.stringify(content)
        }));
    }

    let post;
    try {
        const requestedSlug = toPlainText(req.body.slug, 200);
        const baseSlug = generateSlug(requestedSlug) || generateSlug(values.title) || 'publication';
        const slug = await ensureUniqueSlug(baseSlug);
        const readTime = values.read_time || estimateReadTime(content.sections);

        post = await Post.create({
            ...values,
            slug,
            read_time: readTime,
            content,
            content_format: 'sections_v1',
            kind: 'publication',
            author_id: req.admin.id,
            updated_by: req.admin.id
        });

        if (dropped > 0) {
            console.warn(`Publication ${post.id}: ${dropped} content block(s) were dropped during validation.`);
        }
    } catch (error) {
        console.error('Admin create publication failed:', error);
        const categories = await Post.getCategories({ kind: 'publication' }).catch(() => []);
        return res.status(500).render('admin/publication-editor', pubEditorLocals({
            errors: ['The publication could not be saved. Check that the Phase 1 database migration has been run.'],
            categories,
            values: rawPostInput(req.body),
            detailValues: rawDetailInput(req.body),
            contentJson: JSON.stringify(content)
        }));
    }

    try {
        await PublicationDetails.upsert(post.id, detailValues);
    } catch (error) {
        // The post itself saved successfully; only the journal-specific
        // details failed. Send the admin back into the same post to retry
        // rather than losing the post they just created.
        console.error('Admin create publication details failed:', error);
        return res.redirect(303, `${adminPath}/publications/${post.id}/edit?detailsError=1`);
    }

    await PostRevision.record(post.id, req.body, req.admin.id);

    return res.redirect(303, `${adminPath}/publications/${post.id}/edit?saved=1`);
};

exports.getEditPublication = async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) {
        return showError(res, 404, 'That publication could not be found.');
    }

    try {
        const post = await Post.adminFindById(id);
        if (!post) {
            return showError(res, 404, 'That publication could not be found.');
        }
        if (post.kind !== 'publication') {
            return res.redirect(303, `${adminPath}/posts/${post.id}/edit`);
        }

        const [categories, details] = await Promise.all([
            Post.getCategories({ kind: 'publication' }),
            PublicationDetails.getByPostId(id)
        ]);
        const history = await loadEditorHistory(id, req.query);

        res.render('admin/publication-editor', pubEditorLocals({
            post,
            categories,
            values: history.restored ? rawPostInput(history.restored.snapshot) : valuesFromPost(post),
            detailValues: history.restored ? rawDetailInput(history.restored.snapshot) : detailValuesFromRecord(details),
            contentJson: history.restored
                ? (history.restored.snapshot.content || '{"sections":[]}')
                : JSON.stringify(post.content && post.content.sections ? post.content : { sections: [] }),
            saved: req.query.saved === '1',
            detailsError: req.query.detailsError === '1',
            revisions: history.revisions,
            autosaveAvailable: history.autosaveAvailable,
            viewingRevision: history.restored ? history.restored.timestamp : null
        }));
    } catch (error) {
        console.error('Admin edit publication load failed:', error);
        showError(res, 500, 'This publication could not be loaded.');
    }
};

exports.postUpdatePublication = async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) {
        return showError(res, 404, 'That publication could not be found.');
    }

    let existing;
    try {
        existing = await Post.adminFindById(id);
    } catch (error) {
        console.error('Admin update publication lookup failed:', error);
        return showError(res, 500, 'This publication could not be loaded.');
    }
    if (!existing) {
        return showError(res, 404, 'That publication could not be found.');
    }
    if (existing.kind !== 'publication') {
        return res.redirect(303, `${adminPath}/posts/${id}/edit`);
    }

    const { errors: postErrors, values } = parsePostForm(req.body);
    const { errors: detailErrors, values: detailValues } = parsePublicationForm(req.body);
    const { content, dropped, error: contentError } = normalizeContent(req.body.content);
    const errors = [...postErrors, ...detailErrors];
    if (contentError) errors.push(`Content could not be read: ${contentError}`);

    if (errors.length) {
        const categories = await Post.getCategories({ kind: 'publication' });
        return res.status(400).render('admin/publication-editor', pubEditorLocals({
            post: existing,
            errors,
            categories,
            values: rawPostInput(req.body),
            detailValues: rawDetailInput(req.body),
            contentJson: JSON.stringify(content)
        }));
    }

    try {
        const requestedSlug = toPlainText(req.body.slug, 200);
        const baseSlug = generateSlug(requestedSlug) || generateSlug(values.title) || 'publication';
        const slug = baseSlug === existing.slug ? existing.slug : await ensureUniqueSlug(baseSlug, id);
        const readTime = values.read_time || estimateReadTime(content.sections);

        await Post.update(id, { ...values, slug, read_time: readTime, content, updated_by: req.admin.id });
        await PublicationDetails.upsert(id, detailValues);

        if (dropped > 0) {
            console.warn(`Publication ${id}: ${dropped} content block(s) were dropped during validation.`);
        }

        await PostRevision.record(id, req.body, req.admin.id);
        await PostAutosave.clear(id);

        return res.redirect(303, `${adminPath}/publications/${id}/edit?saved=1`);
    } catch (error) {
        console.error('Admin update publication failed:', error);
        const categories = await Post.getCategories({ kind: 'publication' }).catch(() => []);
        return res.status(500).render('admin/publication-editor', pubEditorLocals({
            post: existing,
            errors: ['The publication could not be saved.'],
            categories,
            values: rawPostInput(req.body),
            detailValues: rawDetailInput(req.body),
            contentJson: JSON.stringify(content)
        }));
    }
};

// ------------------------------------------------------------
// Media upload (cover images and in-content images)
// ------------------------------------------------------------

exports.postUploadMedia = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file was uploaded.' });
    }

    const path = buildStoragePath(req.file.mimetype);
    if (!path) {
        return res.status(400).json({ success: false, error: 'Unsupported file type. Use JPEG, PNG, WebP or GIF.' });
    }

    try {
        const { error } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
        if (error) throw error;

        const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
        return res.json({ success: true, url: data.publicUrl });
    } catch (error) {
        console.error('Admin media upload failed:', error);
        return res.status(500).json({ success: false, error: 'Upload failed. Check that the media storage bucket has been created (migration 006).' });
    }
};

exports.postUploadPdf = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file was uploaded.' });
    }

    const path = buildStoragePath(req.file.mimetype, { kind: 'documents' });
    if (!path) {
        return res.status(400).json({ success: false, error: 'Unsupported file type. Only PDF is accepted.' });
    }

    try {
        const { error } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
        if (error) throw error;

        const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
        return res.json({ success: true, url: data.publicUrl });
    } catch (error) {
        console.error('Admin PDF upload failed:', error);
        return res.status(500).json({ success: false, error: 'Upload failed. Check that the media storage bucket allows PDFs (migration 007).' });
    }
};

// ------------------------------------------------------------
// Autosave (used by both the blog post and publication editors - the
// payload is stored as-is, so it works the same regardless of kind)
// ------------------------------------------------------------

const MAX_AUTOSAVE_JSON_LENGTH = 1_000_000; // 1 MB of form field text is far more than any real edit needs

exports.postAutosave = async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) {
        return res.status(404).json({ success: false, error: 'Not found' });
    }
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ success: false, error: 'Invalid autosave payload' });
    }
    if (JSON.stringify(req.body).length > MAX_AUTOSAVE_JSON_LENGTH) {
        return res.status(413).json({ success: false, error: 'Autosave payload too large' });
    }

    try {
        await PostAutosave.save(id, req.body, req.admin.id);
        return res.json({ success: true, savedAt: new Date().toISOString() });
    } catch (error) {
        console.error('Admin autosave failed:', error);
        return res.status(500).json({ success: false, error: 'Autosave failed' });
    }
};

exports.postDiscardAutosave = async (req, res) => {
    const { id } = req.params;
    if (!isUuid(id)) {
        return showError(res, 404, 'That post could not be found.');
    }

    await PostAutosave.clear(id);

    try {
        const post = await Post.adminFindById(id);
        const back = post && post.kind === 'publication' ? 'publications' : 'posts';
        return res.redirect(303, `${adminPath}/${back}/${id}/edit`);
    } catch (error) {
        return res.redirect(303, `${adminPath}/posts/${id}/edit`);
    }
};

// ------------------------------------------------------------
// Revision diff ("what would restoring this change?")
// ------------------------------------------------------------

exports.getRevisionDiff = async (req, res) => {
    const { id, revId } = req.params;
    if (!isUuid(id) || !isUuid(revId)) {
        return showError(res, 404, 'That revision could not be found.');
    }

    try {
        const post = await Post.adminFindById(id);
        if (!post) return showError(res, 404, 'That post could not be found.');

        const revision = await PostRevision.get(id, revId);
        if (!revision) return showError(res, 404, 'That revision could not be found.');

        const isPublication = post.kind === 'publication';
        const backPrefix = isPublication ? 'publications' : 'posts';

        const currentSnapshot = { ...valuesFromPost(post), content: JSON.stringify(post.content || { sections: [] }) };
        if (isPublication) {
            const details = await PublicationDetails.getByPostId(id);
            Object.assign(currentSnapshot, detailValuesFromRecord(details));
        }

        const diff = diffSnapshots(currentSnapshot, revision.snapshot);

        res.render('admin/revision-diff', {
            title: 'Compare revision',
            section: isPublication ? 'publications' : 'blog',
            post,
            backPrefix,
            revision,
            diff
        });
    } catch (error) {
        console.error('Admin revision diff failed:', error);
        showError(res, 500, 'This revision could not be compared.');
    }
};

exports.MAX_FILE_BYTES = MAX_FILE_BYTES;
exports.MAX_DOCUMENT_BYTES = MAX_DOCUMENT_BYTES;
exports.mediaExtensionFor = extensionFor;
exports.documentExtensionFor = documentExtensionFor;
