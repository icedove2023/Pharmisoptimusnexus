-- 007_publication_media.sql
-- Extends the "media" bucket (created in 006) so publications can attach a
-- PDF, alongside the images it already allows. Run in the Supabase SQL
-- editor after 006. Safe to run more than once.

UPDATE storage.buckets
SET
    file_size_limit = 20971520, -- 20 MB, enough for the PDF; images still capped client-side at 8 MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
WHERE id = 'media';
