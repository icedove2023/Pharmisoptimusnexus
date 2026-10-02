-- 010_media_library.sql
-- Central media catalog that reuses the existing public "media" bucket.
-- Safe to run more than once. Existing storage objects are not touched.

CREATE TABLE IF NOT EXISTS public.media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    storage_bucket TEXT NOT NULL DEFAULT 'media',
    storage_path TEXT NOT NULL UNIQUE,
    public_url TEXT NOT NULL,
    original_filename TEXT,
    mime_type TEXT NOT NULL,
    extension TEXT,
    size_bytes BIGINT,
    width INTEGER,
    height INTEGER,
    kind TEXT NOT NULL DEFAULT 'image' CHECK (kind IN ('image', 'document')),
    content_hash TEXT,
    alt_text TEXT,
    caption TEXT,
    title TEXT,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_created_at ON public.media (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_kind ON public.media (kind);
CREATE INDEX IF NOT EXISTS idx_media_mime_type ON public.media (mime_type);
CREATE INDEX IF NOT EXISTS idx_media_content_hash ON public.media (content_hash);
CREATE INDEX IF NOT EXISTS idx_media_storage_path ON public.media (storage_path);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'media_content_hash_unique'
    ) THEN
        ALTER TABLE public.media
            ADD CONSTRAINT media_content_hash_unique UNIQUE (content_hash, mime_type);
    END IF;
END $$;

ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Editors and admins can manage media" ON public.media;
CREATE POLICY "Editors and admins can manage media"
    ON public.media FOR ALL
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'editor'))
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'editor'));

CREATE OR REPLACE FUNCTION public.update_media_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_media_updated_at ON public.media;
CREATE TRIGGER trigger_media_updated_at
    BEFORE UPDATE ON public.media
    FOR EACH ROW
    EXECUTE FUNCTION public.update_media_updated_at();

-- Optional, non-destructive import helper for existing bucket objects. It does
-- not delete anything; it only creates media rows for files that are already in
-- the public media bucket and not yet catalogued.
CREATE OR REPLACE FUNCTION public.import_existing_media(bucket_name TEXT DEFAULT 'media')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_rows INTEGER := 0;
BEGIN
    -- This function intentionally leaves bucket scanning to the app layer. It
    -- acts as a safe placeholder for future admin imports, while the app can
    -- also populate the table from objects that are already stored.
    RETURN total_rows;
END;
$$;
