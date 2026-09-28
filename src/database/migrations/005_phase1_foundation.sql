-- 005_phase1_foundation.sql
-- Phase 1 foundation. Run in the Supabase SQL editor AFTER 004, BEFORE deploying
-- the Phase 1 code. Safe to run more than once.
--
-- 1. posts: explicit kind (blog or publication), publishing status, and room
--    for the upcoming editors.
-- 2. publication_details: journal-style fields for publications (Phase 3).
-- 3. post_views / post_likes: de-duplicated engagement, written only by the
--    server through security-definer functions.
-- 4. contact_messages: contact form inbox.

-- ------------------------------------------------------------
-- 1. POSTS
-- ------------------------------------------------------------

-- kind is added once. The backfill copies the old rule (a fixed list of
-- category names) so existing publications stay publications. It only runs on
-- the first execution, so later edits are never overwritten.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'kind'
    ) THEN
        ALTER TABLE posts ADD COLUMN kind TEXT NOT NULL DEFAULT 'blog';
        UPDATE posts
        SET kind = 'publication'
        WHERE category IN ('Review Articles', 'AI & Biotechnology', 'Research Articles', 'Others');
    END IF;
END $$;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'published';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
-- Which format the content column holds. 'sections_v1' is the current block list.
ALTER TABLE posts ADD COLUMN IF NOT EXISTS content_format TEXT NOT NULL DEFAULT 'sections_v1';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_kind_check') THEN
        ALTER TABLE posts ADD CONSTRAINT posts_kind_check CHECK (kind IN ('blog', 'publication'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'posts_status_check') THEN
        ALTER TABLE posts ADD CONSTRAINT posts_status_check
            CHECK (status IN ('draft', 'scheduled', 'published', 'archived'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_posts_kind_status_date ON posts (kind, status, published_date DESC);

-- Visitors only see published posts. Editors and admins (policy from 004) see all.
DROP POLICY IF EXISTS "Allow public read access to posts" ON posts;
DROP POLICY IF EXISTS "Public can read published posts" ON posts;
CREATE POLICY "Public can read published posts"
    ON posts FOR SELECT
    USING (status = 'published');

-- ------------------------------------------------------------
-- 2. PUBLICATION DETAILS (1:1 with posts where kind = 'publication')
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS publication_details (
    post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    article_type TEXT,
    abstract TEXT,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    doi TEXT,
    volume TEXT,
    issue TEXT,
    pages TEXT,
    received_date DATE,
    accepted_date DATE,
    corresponding_author TEXT,
    pdf_url TEXT,
    license TEXT,
    author_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    reference_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE publication_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read details of published publications" ON publication_details;
CREATE POLICY "Public can read details of published publications"
    ON publication_details FOR SELECT
    USING (EXISTS (SELECT 1 FROM posts p WHERE p.id = post_id AND p.status = 'published'));

DROP POLICY IF EXISTS "Editors and admins manage publication details" ON publication_details;
CREATE POLICY "Editors and admins manage publication details"
    ON publication_details FOR ALL
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'editor'))
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'editor'));

DROP TRIGGER IF EXISTS update_publication_details_updated_at ON publication_details;
CREATE TRIGGER update_publication_details_updated_at
    BEFORE UPDATE ON publication_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- 3. ENGAGEMENT (views and likes)
-- ------------------------------------------------------------
-- visitor_hash is an HMAC of an anonymous first-party cookie value. Nothing
-- here identifies a person. RLS is on with no policies, so only the server
-- (service role) can touch these tables.

CREATE TABLE IF NOT EXISTS post_views (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    visitor_hash TEXT NOT NULL,
    viewed_on DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'utc')::date),
    referer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT post_views_unique_per_day UNIQUE (post_id, visitor_hash, viewed_on)
);
CREATE INDEX IF NOT EXISTS idx_post_views_viewed_on ON post_views (viewed_on);

CREATE TABLE IF NOT EXISTS post_likes (
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    visitor_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, visitor_hash)
);

ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Count one view per visitor per post per day. Returns whether it was counted
-- and the current total.
CREATE OR REPLACE FUNCTION record_post_view(p_post_id UUID, p_visitor TEXT, p_referer TEXT DEFAULT NULL)
RETURNS TABLE (counted BOOLEAN, views INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    inserted INTEGER;
BEGIN
    INSERT INTO post_views (post_id, visitor_hash, referer)
    VALUES (p_post_id, p_visitor, LEFT(p_referer, 500))
    ON CONFLICT ON CONSTRAINT post_views_unique_per_day DO NOTHING;
    GET DIAGNOSTICS inserted = ROW_COUNT;

    IF inserted > 0 THEN
        UPDATE posts SET views = COALESCE(posts.views, 0) + 1 WHERE id = p_post_id;
    END IF;

    counted := inserted > 0;
    SELECT COALESCE(p.views, 0) INTO views FROM posts p WHERE p.id = p_post_id;
    RETURN NEXT;
END;
$$;

-- Like if not liked, unlike if liked. Atomic. Returns the new state and total.
CREATE OR REPLACE FUNCTION toggle_post_like(p_post_id UUID, p_visitor TEXT)
RETURNS TABLE (liked BOOLEAN, likes INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM post_likes WHERE post_id = p_post_id AND visitor_hash = p_visitor;
    IF FOUND THEN
        UPDATE posts SET likes = GREATEST(COALESCE(posts.likes, 0) - 1, 0) WHERE id = p_post_id;
        liked := FALSE;
    ELSE
        INSERT INTO post_likes (post_id, visitor_hash) VALUES (p_post_id, p_visitor)
        ON CONFLICT DO NOTHING;
        UPDATE posts SET likes = COALESCE(posts.likes, 0) + 1 WHERE id = p_post_id;
        liked := TRUE;
    END IF;

    SELECT COALESCE(p.likes, 0) INTO likes FROM posts p WHERE p.id = p_post_id;
    RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION record_post_view(UUID, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION toggle_post_like(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION record_post_view(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION toggle_post_like(UUID, TEXT) TO service_role;

-- ------------------------------------------------------------
-- 4. CONTACT MESSAGES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
    ip_hash TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status_created ON contact_messages (status, created_at DESC);
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Old Google Sheets objects (sync_log, sync_posts) and the legacy views/likes
-- tables are no longer used. They are left in place; drop them when you are
-- sure you do not need the history.
