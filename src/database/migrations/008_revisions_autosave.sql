-- 008_revisions_autosave.sql
-- Autosave drafts and revision history for the post/publication editors.
-- Run in the Supabase SQL editor after 001-007. Safe to run more than once.
--
-- Both tables are admin-only: RLS is enabled with no policies at all, so
-- only the server's service-role key can read or write them (same pattern
-- as post_views/post_likes/contact_messages). This is deliberate - an
-- autosave snapshot of an in-progress edit to an already-published post
-- must never be visible through the public "published posts" read policy,
-- so it lives in its own table rather than as columns on posts.

CREATE TABLE IF NOT EXISTS post_autosaves (
    post_id UUID PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    snapshot JSONB NOT NULL,
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE post_autosaves ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS post_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    snapshot JSONB NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_post_revisions_post_created ON post_revisions (post_id, created_at DESC);
ALTER TABLE post_revisions ENABLE ROW LEVEL SECURITY;

-- Keep only the most recent 20 revisions per post. Called after every
-- insert (from the application) rather than a trigger, so a single slow
-- delete never blocks the save itself from returning.
CREATE OR REPLACE FUNCTION prune_post_revisions(p_post_id UUID, p_keep INTEGER DEFAULT 20)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM post_revisions
    WHERE post_id = p_post_id
      AND id NOT IN (
          SELECT id FROM post_revisions
          WHERE post_id = p_post_id
          ORDER BY created_at DESC
          LIMIT p_keep
      );
$$;

REVOKE ALL ON FUNCTION prune_post_revisions(UUID, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION prune_post_revisions(UUID, INTEGER) TO service_role;
