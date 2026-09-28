# Phase 4: Site content admin, plus autosave, revisions, cropping, citation export, and PDF preview

This phase covers the last of the original roadmap (admin-managed slideshow
and About page team/officials) plus four features you asked to add now
rather than later: image cropping, autosave with revision history, BibTeX/RIS
citation export, and inline PDF preview.

## Setup

Run these in order in the Supabase SQL editor (after 001-007 from earlier
phases):

1. `008_revisions_autosave.sql` - autosave drafts and revision history.
2. `009_site_content.sql` - hero slides and team members tables.
3. `010_seed_team.sql` - seeds the 9 officials that were hardcoded in
   `about.ejs`, each already assigned to their real team and marked as that
   team's lead (see "Team structure" below). Only inserts if the table is
   still empty, so it's safe even if you've already added people by hand.
4. `011_team_structure.sql` - adds the `is_leader` flag and restricts
   `team_group` to the organization's four real groups.

Then `npm install && npm test && npm run dev` as usual - no new environment
variables this phase.

## Team structure

The site now has four groups: **CEC** (Central Executive Council) and three
teams - **Health and Wellness**, **Media and Publications**, and
**Community Outreach**. Each person belongs to exactly one group and can be
marked as that group's lead.

- **About page**: shows each group's name and its leader(s) only (via
  `TeamMember.listLeadersGrouped()`), in that fixed order, matching the
  organizational chart rather than an arbitrary list.
- **Three new pages** - `/teams/health-and-wellness`,
  `/teams/media-and-publications`, `/teams/community-outreach` - each show
  that team's full membership (leads first, then everyone else). CEC has no
  such page, matching what you asked for: three team pages, not four.
- The About page links to each of the three team pages under that team's
  leader section ("Meet the full [team] team").
- The admin team editor (`ADMIN_PATH/team`) now uses a fixed dropdown for
  group (not free text) and a "Team lead" checkbox, and lists people
  by group in that same fixed order so an empty group still shows with an
  "no one in this group yet" placeholder instead of disappearing.

The 9 people already on the site were assigned to groups based on their
existing titles (e.g. "Director of Outreach" to Community Outreach,
"Clinical Lead" to Health and Wellness). Please double check that mapping in
`admin/team` once it's live and correct any I guessed wrong.

## Slideshow (hero_slides)

`ADMIN_PATH/slides` - add, edit, reorder (up/down) and hide slides, each
with an image, headline, subtitle, label and optional link. The home page
already had client-side code that fetches `/api/hero-slides` and falls back
to its three built-in slides if that returns empty (from Phase 0, before
slides existed) - that endpoint now returns your real slides, and the
homepage needed no changes at all.

While wiring this up I found the homepage's slide-rendering JavaScript built
each slide's HTML with template-literal string interpolation
(`` `<h2>${slide.headline}</h2>` `` via `innerHTML`), which would have let
an admin-entered headline containing HTML actually execute as markup - a
stored-XSS risk once slide content became admin-editable instead of
hardcoded. Fixed to build each element and set `.textContent`/`.src`
directly instead.

## Team/officials (team_members)

`ADMIN_PATH/team` - covered above under "Team structure".

## Autosave and revision history

Every save (create or update) now records a full snapshot to a
`post_revisions` table - up to the most recent 20 per post, older ones
pruned automatically. The editor's sidebar shows a "History" panel listing
recent saves with a "Restore" link.

While editing an existing post or publication, the browser also autosaves
the current form (title, content, everything) every 25 seconds to a
separate `post_autosaves` slot - not the real post, so nothing is published
or overwritten until you actually click Save. If you leave and come back to
an unsaved draft, a banner offers to restore it or discard it. A brand-new,
never-saved post has nothing to autosave against yet, so autosave starts
after the first save.

"Restore" (either a revision or an autosave draft) loads that snapshot into
the form - it does not save anything by itself. A banner reminds you to
click Save to make it the current version, so restoring a very old revision
is never a silent, unrecoverable action.

Both tables are admin-only at the database level (no public read policy at
all, not even for published posts) - an in-progress draft of a live post
should never be reachable the way the post itself is.

## Image cropping

Every image upload in the block editor, the cover image, and now the slide
and team-photo pickers open a crop step first: drag to reposition, drag the
corner handle to resize, pick a ratio (Free / 1:1 / 4:3 / 16:9), or just use
the original. Cropping happens entirely in the browser with a `<canvas>`
before the file is uploaded - the upload endpoint itself didn't need to
change at all, and cropped images are capped at 1600px on their longest
side so a crop from a huge source photo doesn't upload a huge file.

The crop math (keeping the box on-image, matching a ratio, sizing the
output) is separated into pure functions with 14 tests. The drag interaction
itself is standard browser pointer events, which - like every other bit of
DOM/browser wiring in this project - could not be tested without an actual
browser in this environment.

## BibTeX and RIS export

Every publication page now has "Download BibTeX" and "Download RIS" links
next to its citation box, generating a `.bib` or `.ris` file from the same
data the plain-text citation already used (title, authors, journal, volume,
issue, pages, DOI, abstract, keywords). Both formats are hand-built (not a
third-party library, for the same no-network-to-verify-a-dependency reason
as the HTML sanitizer in Phase 2) and covered by 12 tests, including that
neither format ever includes the literal word "undefined" when a field is
missing.

## Inline PDF preview

A publication with a PDF attached now has a "Preview PDF" button next to
the download link, which loads the file into an inline viewer on the page
(the browser's own built-in PDF renderer, nothing custom) only when clicked
- so a page with a large PDF attached doesn't fetch it just from being
viewed.

## Addendum: small fixes after this phase shipped

- `ADMIN_PATH` validation was missing `/teams` from its reserved-path list,
  so setting `ADMIN_PATH=/teams` would have silently collided with the new
  public team pages. Added.
- The publications listing already computed a list of years server-side
  (`years`/`currentYear`) but no control in the template ever used it -
  flagged as dead in the Phase 1 and Phase 3 write-ups. Added the actual
  `<select>` and its client-side handler, matching the existing category
  filter.
- The crop modal now closes on Escape or a click outside it (treated as
  "use the original, uncropped image" either way, the same as the explicit
  button), and moves focus to the Apply button when it opens.

## What's still not done

- No BibTeX/RIS import, only export.
- No author or reviewer accounts (unchanged from Phase 3).
- Revision history has no diff view - each entry is "restore this whole
  snapshot", not a field-by-field comparison.
- The crop tool can be dismissed with Escape but still has no way to move or
  resize the crop box from the keyboard - dragging is pointer-only.

As with every phase, nothing here was run against a live server, database,
or browser in this environment. 183 tests pass and everything is
syntax-checked, but please migrate, `npm install`, and click through all of
this yourself - especially the crop tool and the autosave restore flow,
since those involve the most actual browser interaction of anything built
so far.

## Tests added this phase (41 new, 183 total)

- `exportFormats.js`: 12 tests (BibTeX and RIS generation).
- `imageCrop.js`: 14 tests (crop-box geometry, clamping, aspect ratios,
  output sizing).
- `siteContentForm.js`: 15 tests for slide and team-member validation,
  including the fixed four-group check added for the team-structure
  follow-up.
