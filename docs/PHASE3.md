# Phase 3: Publications editor and journal-style design

This phase gives publications their own editor (on top of the same
block-based body content blogs use) and redesigns both publication pages to
look like a 2026 journal rather than a blog. Blog posts and their pages are
untouched by this phase.

## Setup

1. Run `src/database/migrations/007_publication_media.sql` in the Supabase
   SQL editor (after 001-006). It extends the `media` storage bucket from
   Phase 2 to also accept PDF uploads (up to 20 MB).
2. `npm install`, `npm test`, `npm run dev`. No new environment variables.
3. Try it: `ADMIN_PATH/publications/new`, and visit `/publications` and a
   published publication's page afterward.

## The publication editor

`ADMIN_PATH/publications/new` and `/publications/:id/edit` - it has
everything the blog editor has (title, block-based body content, cover
image, status, slug, category, tags), plus:

- **Abstract and keywords** - shown in a distinct box on the article page.
- **Journal details** - article type, DOI, volume, issue, pages, received
  and accepted dates, corresponding author, and a license (defaults to
  "All rights reserved" - a small compliance detail worth getting right
  since it appears on the public page).
- **Authors with affiliations** - one per line (`Name | Affiliation`), shown
  under the title the way a journal article credits its authors, not as a
  plain comma list.
- **References** - one per line, with an optional link
  (`Citation text | https://...`), rendered as a numbered list.
- **PDF upload** - a publication can have a downloadable PDF alongside its
  web version.

This is a second table, not a second content format: the body content
(headings, images, lists, everything from Phase 2) is saved to the same
`posts.content` column as a blog post's, and only the journal-specific
fields above go into the new `publication_details` table (one row per
publication). Editing a blog post and editing a publication now redirect
to each other's editor automatically if you land on the wrong one for that
post's kind, rather than showing an error.

## The public pages

**`/publications`** is now a journal index: a numbered list of entries (date,
article type, volume/issue on the left; title, authors, abstract snippet on
the right) instead of the old photo-banner cards borrowed from the blog
design. Along the way I noticed the filter bar's search box and category
dropdown had no styling at all on the live page - they depended on
`blog.css`, which this page never loads (`views/layouts/main.ejs` only
loads the one stylesheet named in `pageStyles`). Fixed by giving
`publications.css` its own copy of that styling.

**`/publications/:slug`** now has a real journal masthead: breadcrumb,
article type badge, serif title, structured author list with affiliations,
corresponding author line, and a metadata strip (journal name, volume/issue,
pages, date, a clickable DOI). Below that: an abstract box with keyword
chips, the full text, a numbered references list, and a "Cite this article"
box with a one-click copy button and a plain-text APA-style citation built
from the publication's own data (`src/utils/citation.js`, 8 tests). A PDF
download button appears in the stats bar when one was uploaded.

Both pages render body content through one shared partial
(`src/views/partials/content-blocks.ejs`) - the same one the blog post page
now uses (extracted from it in this phase). One rendering source, two very
different designs: `blog-post.css` and `publication.css` style the same
block class names completely differently, which is what let the block
editor from Phase 2 work for both content types without being rebuilt.

Every publication's content is re-validated and re-sanitized on every
render, exactly like blog posts - a publication saved before this phase
(with no `publication_details` row yet) still renders correctly, just with
an empty journal details box until it's edited and saved once.

## What this phase does not do

- No BibTeX/RIS export, just the plain-text citation with a copy button.
- No author or reviewer accounts - authors are text entered by whoever is
  editing, not linked user profiles.
- No PDF preview inline; the PDF button opens/downloads the file directly.
- The listing's year filter (`years`/`currentYear`, noted as dead in the
  Phase 1 write-up) is still not wired to a control - left alone again,
  since a proper filter UI is a small follow-up, not a blocker.

As with every phase so far: no live server, database, or browser was
available to actually click through this in this environment. Everything
here is syntax-checked and unit-tested (142 tests total, all passing), but
please run through the editor and both public pages yourself after
`npm install && npm run dev`.

## Tests added this phase (8 new, 142 total)

- `publicationForm.js`: 11 tests for the journal-field validation (authors,
  references, dates, DOI, PDF URL).
- `citation.js`: 8 tests for the citation builder, including the "no
  'undefined' in the output" and DOI-normalization cases.
