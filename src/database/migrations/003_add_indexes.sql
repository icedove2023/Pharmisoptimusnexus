-- ============================================================
-- MIGRATION: 003_add_indexes
-- Description: Add performance indexes to all tables
-- Created: 2026-06-28
-- ============================================================

-- ============================================================
-- POSTS TABLE INDEXES
-- ============================================================

-- Slug index (for fast lookups)
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);

-- Category index (for filtering)
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);

-- Published date index (for sorting)
CREATE INDEX IF NOT EXISTS idx_posts_published_date ON posts(published_date DESC);

-- Featured posts index
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(featured) WHERE featured = true;

-- Tags index (GIN for array operations)
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN(tags);

-- Authors index (GIN for array operations)
CREATE INDEX IF NOT EXISTS idx_posts_authors ON posts USING GIN(authors);

-- Google ID index (for sync operations)
CREATE INDEX IF NOT EXISTS idx_posts_google_id ON posts(google_id);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_posts_search ON posts USING GIN(
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(excerpt, '') || ' ' || COALESCE(content::text, ''))
);

-- ============================================================
-- COMMENTS TABLE INDEXES
-- ============================================================

-- Post ID index
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

-- Parent ID index (for nested comments)
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);

-- Created date index
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Approval status index
CREATE INDEX IF NOT EXISTS idx_comments_is_approved ON comments(is_approved) WHERE is_approved = true;

-- Author index (for admin)
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author);

-- Email index (for moderation)
CREATE INDEX IF NOT EXISTS idx_comments_email ON comments(email);

-- ============================================================
-- LIKES TABLE INDEXES
-- ============================================================

-- Post ID index
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);

-- User ID index
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);

-- Unique constraint for preventing duplicate likes (already created in table)
-- Creating unique index for additional coverage
CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_unique_session ON likes(post_id, session_id) WHERE session_id IS NOT NULL;

-- ============================================================
-- VIEWS TABLE INDEXES
-- ============================================================

-- Post ID index
CREATE INDEX IF NOT EXISTS idx_views_post_id ON views(post_id);

-- Session ID index
CREATE INDEX IF NOT EXISTS idx_views_session_id ON views(session_id);

-- Created date index (for analytics)
CREATE INDEX IF NOT EXISTS idx_views_created_at ON views(created_at);

-- IP address index (for unique view counting)
CREATE INDEX IF NOT EXISTS idx_views_ip_address ON views(ip_address);

-- ============================================================
-- SYNC LOG TABLE INDEXES
-- ============================================================

-- Operation index
CREATE INDEX IF NOT EXISTS idx_sync_log_operation ON sync_log(operation);

-- Created date index
CREATE INDEX IF NOT EXISTS idx_sync_log_created_at ON sync_log(created_at);

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Check all indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('posts', 'comments', 'likes', 'views', 'sync_log')
ORDER BY tablename, indexname;