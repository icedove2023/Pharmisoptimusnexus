# Media Library

## Purpose

This project keeps its existing Supabase Storage architecture and adds a central `media` catalog so the same uploaded file can be reused across posts, slides, team members, and content blocks without uploading duplicates repeatedly.

## Storage and compatibility

- The real binary storage remains the existing `media` bucket in Supabase Storage.
- The app continues to use server-side upload routes with the service-role client.
- Public URLs remain valid and are still used by existing records such as `posts.image_url`, `hero_slides.image_url`, and `team_members.photo_url`.
- The new `media` table is backward-compatible and does not remove or rewrite legacy URL fields.

## Database migration

Run the migration at `src/database/migrations/010_media_library.sql` in the Supabase SQL editor.

Important notes:

- The table name is `public.media`.
- `storage_path` is unique.
- `content_hash` is indexed and combined with `mime_type` as the deduplication guard.
- `uploaded_by` references `auth.users(id)` when the uploader is known.

## Upload flow

When an admin uploads an image or PDF through the existing admin routes:

1. The server validates MIME type and file size.
2. It calculates a SHA-256 hash from the raw buffer.
3. It looks for an existing `media` record with the same `content_hash` and `mime_type`.
4. If a matching record exists, the app reuses it and does not upload another copy to Supabase Storage.
5. Otherwise, it stores the file in the `media` bucket and inserts the catalog row.

This keeps one physical file and one catalog record for the same content content.

## Existing asset import

The app also supports a safe import path for files already stored in the `media` bucket. The migration and model are designed so existing URLs can be catalogued without deleting or moving anything.

## Delete protection

Before deleting a media item, the server checks whether it is still referenced by:

- posts.image_url
- posts.content image/gallery blocks
- hero_slides.image_url
- team_members.photo_url
- publication_details.pdf_url

If those references still exist, the delete is blocked and the admin sees an in-use message instead of a silent break.

## Admin routes

The new admin routes are:

- `GET /studio/media`
- `GET /studio/media/:id`
- `POST /studio/media`
- `DELETE /studio/media/:id`

These use the same admin authorization guard as the rest of the admin system.

## Media library UI

The admin can:

- browse files
- search by filename/title/caption
- filter by image vs. document
- sort newest/oldest
- use an image in the existing editors
- open and reuse existing assets instead of re-uploading

## Environment and deployment

No new provider or storage service is required. The app continues to use the current Supabase environment variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

The service role key remains server-side only and is never exposed to browser code.
