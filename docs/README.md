# Pharmis Optimus Nexus - rebuild documentation

Start here. This folder documents everything done to the site across six
phases, in order. Each phase's own file has the detail; this page is the
index and the setup checklist.

**Nothing in this rebuild has been run against a live server, a live
Supabase project, or a real browser** - there was no network or browser
access in the environment this was built in. Every piece of logic that
could be isolated from the database and the browser (validation, the HTML
sanitizer, citation formatting, slug generation, the crop math, and more)
is covered by an automated test - 209 of them, all passing
(`npm test`). Everything else - the actual page rendering, the admin UI,
file uploads, the database itself - is syntax-checked but **not** verified
against a running system. Please treat this as a thorough draft that needs
your own click-through testing before it goes live, not as a finished,
verified product.

## Setup, in order

1. **Rotate secrets** and remove `.env`/`.env.production` from git history
   if this project was ever pushed with them (see `PHASE0.md`).
2. **Run the migrations, in order** (Supabase SQL editor):
   `001` through `011`, listed below. Each file's own header comment says
   what it does and whether it's safe to re-run.
3. **Turn off open sign-up** in Supabase Auth, and create your admin
   account by hand (`PHASE0.md` has the exact SQL to set its role).
4. **Set environment variables** - copy `.env.example` to `.env` and fill
   in your Supabase project's values, a `SESSION_SECRET`
   (`node scripts/generate-secret.js`), and an `ADMIN_PATH` only your team
   knows.
5. `npm install && npm test && npm run dev`.
6. Sign in at `your-domain/<ADMIN_PATH>/login` and click through the admin
   area described below.

## Migrations, in order

| File | What it does |
|---|---|
| `001_initial_schema.sql` | Original schema (posts, comments, etc.) |
| `002_add_functions.sql` | Original database functions |
| `003_add_indexes.sql` | Original indexes |
| `004_restrict_admin_policies.sql` | Phase 0: locks post/comment write access to admin/editor roles only |
| `005_phase1_foundation.sql` | Phase 1: `kind`/`status` on posts, view/like tables and functions, contact messages table |
| `006_media_storage.sql` | Phase 2: creates the `media` storage bucket for uploaded images |
| `007_publication_media.sql` | Phase 3: extends that bucket to also accept PDFs |
| `008_revisions_autosave.sql` | Phase 4: autosave drafts and revision history tables |
| `009_site_content.sql` | Phase 4: hero slides and team members tables |
| `010_seed_team.sql` | Phase 4: seeds the 9 officials that were hardcoded in `about.ejs`, into their real teams |
| `011_team_structure.sql` | Phase 4 follow-up: adds `is_leader` and restricts `team_group` to the org's actual 4 groups |

## What each phase covers

- **`PHASE0.md`** - Security audit and cleanup: secrets, Google Sheets
  removal, dead code, emoji removal.
- **`PHASE1.md`** - Foundation: the hidden admin login, blogs vs.
  publications as a real database field, views/likes rebuilt correctly,
  the contact form actually saving messages.
- **`PHASE2.md`** - The blog post editor: a block-based content system
  (headings, images, galleries, code, and more), a hand-written HTML
  sanitizer, image uploads.
- **`PHASE3.md`** - Publications get their own editor and a journal-style
  design (masthead, abstract, DOI, references, "cite this article").
- **`PHASE4.md`** - Admin-managed homepage slideshow, the About page's
  team restructured into real groups (CEC + three teams) with their own
  public pages, image cropping, autosave, revision history, BibTeX/RIS
  export, inline PDF preview.
- **`PHASE5.md`** - Full keyboard support in the crop tool, a revision
  diff view, BibTeX/RIS **import**, and a note on why author/reviewer
  accounts were deliberately not built without your explicit sign-off
  first (it would mean a second, public-facing sign-up system, which cuts
  against the "no public accounts, ever" rule the rest of this admin
  system was built around).

## Known gaps, honestly, as of this handoff

- **Comment moderation is still auto-approve.** This was flagged as a
  problem in the very first audit (`PHASE0.md`) and was never actually
  fixed in any phase since - comments still go live immediately
  (`is_approved BOOLEAN DEFAULT TRUE` in the original schema). This is the
  one item from the original audit that fell through the cracks; it should
  be the first thing addressed in any further work.
- No author/reviewer accounts (see `PHASE5.md` for why, and what to decide
  before building it).
- No BibTeX/RIS import on the publication *edit* screen, only *new*.
- No revision content diff at the block level (field-level and block-count
  only).
- No image cropping keyboard support beyond arrow-key move/resize (no
  keyboard way to switch aspect ratio presets without a pointer).
