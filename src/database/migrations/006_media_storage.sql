-- 006_media_storage.sql
-- Creates the "media" storage bucket used for post cover images and
-- in-content images uploaded from the admin editor. Run in the Supabase SQL
-- editor. Safe to run more than once.
--
-- The bucket is public for READ (so images work in <img> tags without a
-- signed URL), but nothing can write to it except the server's service-role
-- key - there is deliberately no INSERT/UPDATE/DELETE policy for anon or
-- authenticated, since uploads always go through the admin API, never
-- directly from the browser to Supabase.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 8388608, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can read media" ON storage.objects;
CREATE POLICY "Public can read media"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'media');

-- No policy grants anon/authenticated write access on purpose: the service
-- role (used only by the server) bypasses RLS entirely, so it does not need
-- one either.
