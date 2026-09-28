# Phase 2: Blog editor and premium block rendering

This phase adds an actual content editor for blog posts, on top of the
admin login and status controls Phase 1 built. Publications keep their old
rendering for now; their editor and journal-style redesign are Phase 3.

## Setup

1. Run `src/database/migrations/006_media_storage.sql` in the Supabase SQL
   editor (after 004 and 005). It creates the `media` storage bucket used for
   cover images and in-content images.
2. `npm install` - this phase adds `multer` (for file uploads) to
   `package.json`. No new environment variables.
3. `npm test`, then `npm run dev` and sign in at your `ADMIN_PATH` to try the
   editor at `ADMIN_PATH/posts/new`.

## What's new

**A real content editor**, not just status toggles: `ADMIN_PATH/posts/new`
and `ADMIN_PATH/posts/:id/edit`. It has:
- Title, excerpt, category (with autocomplete from existing categories),
  tags, authors, status (draft/scheduled/published/archived), a scheduled
  date/time when status is "scheduled", published date, an editable slug
  that auto-fills from the title until touched, and a cover image.
- A block-based body editor: heading, paragraph, list, quote, callout,
  image, gallery, table, code, and divider blocks. Blocks can be added,
  reordered (up/down), and removed. This is the "manages blog creation like
  a full premium blog" system you asked for - a blank post is an empty
  canvas, not a fixed template.
- Paragraphs, list items and callouts support light inline formatting -
  **bold**, *italic*, `` `code` ``, and `[link](url)` - typed directly, no
  toolbar. Simpler than a full WYSIWYG, and unlike a `contenteditable`-based
  one, every part of it can actually be unit tested without a browser.
- Images upload straight from the editor (drag a file in, get a URL back)
  to a private Supabase Storage bucket that only the server can write to.

**Where posts render.** The blog post page (`/blog/:slug`) now renders every
block type with real styling - sized/aligned images, an image gallery grid,
syntax-friendly code blocks, dividers, ordered and bulleted lists - instead
of the old plain-text-only paragraphs. Every post's content is re-validated
and re-sanitized on every render (not just at save time), so this also
applies to posts that already existed before this phase; a post saved with
the old plain-text fields renders exactly the same as before, just now
passed through the same safety checks as new content.

## How the content is kept safe

There's no third-party HTML sanitizer dependency here - I couldn't verify
one would actually install and behave as documented without network access
in this environment, so I wrote a small, fully unit-tested sanitizer
(`src/utils/richText.js`) instead. It only recognizes seven tags
(`b`, `strong`, `i`, `em`, `u`, `s`, `code`, plus links and `<br>`); anything
else - `<script>`, `<img onerror>`, event handler attributes, whatever - is
turned into inert visible text, never dropped silently and never executed.
It's covered by 22 tests including a script tag, a broken-out-of-attribute
attempt, and a `javascript:` link.

On top of that, `src/utils/contentBlocks.js` rebuilds every block field by
field from a fixed list, so a request that bypasses the editor UI entirely
(a direct POST) cannot add unexpected fields, oversized content, or a
non-`https`/non-relative image URL. It never rejects a whole post over one
bad block - it drops just that block and logs how many were dropped.

## A bug fix along the way

While wiring up slug handling for edits, I found `ensureUniqueSlug` was
checking uniqueness against the wrong database column (`google_id` instead
of `id`), left over from an earlier version of the code. In practice this
meant editing a post without changing its title would falsely detect a
collision with itself and silently append "-1" to the slug on every save,
breaking any link to that post from the previous save. Fixed, with a
regression test.

## What this phase does not do

- Publications still use their old editor-less workflow (Phase 1's status
  toggles only) and their old plain-text rendering. Phase 3 gives them a
  proper editor and the journal-style page design.
- No image cropping/resizing on upload - whatever the admin uploads is what
  gets served, up to 8 MB. Consider adding this in a later pass if page
  weight becomes an issue.
- No autosave or revision history yet.
- No drag-to-reorder for blocks, only up/down buttons - simpler to build
  correctly without a browser to test drag interactions in.
- The rich text in paragraphs/lists/callouts is intentionally small (no
  nested formatting, no headings-within-a-block). A full WYSIWYG (e.g.
  Tiptap) was flagged as a future upgrade back in the Phase 0 audit; this
  lite-markdown approach is a deliberately simpler, fully-testable stand-in
  for now.

None of this was run against a live server, a live Supabase project, or in
an actual browser in this environment (no network, no browser here) - only
syntax-checked and unit-tested (121 tests, all passing). Please click through
the editor yourself after `npm install && npm run dev`, especially: image
upload, saving a post with every block type, and viewing it on `/blog/:slug`.

## Tests added this phase (21 new, 121 total)

- `richText.js`: 22 tests, including the tag-mismatch and pathological-input
  edge cases my first draft of the sanitizer actually failed.
- `contentBlocks.js`: 29 tests across all 9 block types, including a
  prototype-pollution attempt on a block object.
- `postForm.js`: 13 tests for the metadata validation.
- `media.js`: 5 tests for the upload path/type validation.
- `slugify.js`: 7 tests, including the `ensureUniqueSlug` regression above.
- `post-editor.js` (client-side lite-markdown conversion): 8 tests, including
  a round-trip check.
