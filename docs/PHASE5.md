# Phase 5: Keyboard crop, revision diff, and citation import

This phase covers everything you flagged as "left for later" after Phase 4,
except one: full keyboard drag/resize in the crop tool (explicitly
requested), a revision diff view, and BibTeX/RIS import. Author/reviewer
accounts are addressed separately below rather than built, for a reason
worth reading before deciding whether you still want it.

## Setup

No new database migrations this phase - everything here is either
client-side (crop tool, citation parsing) or reads data that already
exists (revisions). `npm test` covers the 26 new tests; there's nothing new
to click through in a live database beyond the admin UI itself.

## Full keyboard support in the crop tool

The crop box and its resize handle are now both real stops on the tab
order. Tab to the crop box: arrow keys move it (hold Shift to move faster).
Tab once more to reach the resize handle: arrow keys resize it the same
way, respecting whatever aspect ratio is selected. Enter on either applies
the crop, matching the Apply button; Escape cancels (added in the last
pass). A short instruction line is shown in the modal itself so this isn't
undiscoverable. Opening the modal now focuses the crop box directly, so a
keyboard user can start adjusting immediately rather than landing on a
button first.

The actual keyboard wiring is DOM event-handling code, the same as the
pointer-drag code beside it - neither could be exercised in this
environment without a real browser. The underlying box math it calls
(`clampBox`, `applyAspectRatio`) already had 14 tests from Phase 4 and
didn't change.

## Revision diff view

Each entry in a post or publication's "History" panel now has a **Compare**
link next to Restore. It shows a table of exactly which fields differ
between the current version and that saved revision - title, status,
dates, DOI, abstract, whatever changed - plus whether the full text content
changed and how its block count differs (e.g. "8 blocks" vs "11 blocks").
It does not show a word-level diff inside the content itself; block counts
were the right level of detail without building a second content-diffing
system alongside the block editor.

This reuses the exact same field-mapping functions the editor already uses
to redisplay a form (`valuesFromPost`, `detailValuesFromRecord`), so the
comparison is apples-to-apples with what's actually in the form - not a
new, separate notion of what a post "is". `src/utils/snapshotDiff.js` is
the pure comparison logic, 11 tests.

## BibTeX / RIS import

The new-publication screen (not the edit screen - importing over an
existing publication's already-entered data seemed more likely to cause
an accidental overwrite than help) now has an "Import from BibTeX or RIS"
box. Paste a citation exported from another system, click "Parse and fill
fields", and the title, authors, DOI, volume, issue, pages, abstract and
keywords fields fill in. Nothing is saved by this step - it only populates
the form, which still goes through the normal validation when you click
Save.

Like the HTML sanitizer and citation export in earlier phases, this is a
hand-written parser rather than a third-party library, for the same
reason: no network access in this environment to verify a dependency
actually installs and behaves as documented. It handles the common shape
of each format (the fields any citation manager exports) - 15 tests,
including nested braces in a BibTeX value, multiple author/keyword lines
in RIS, and text that's neither format. It does not implement either
format's full formal grammar (BibTeX's `@string` macros, for instance)
and silently omits whatever it can't parse rather than guessing.

The parser lives in `src/public/js/importFormats.js` rather than
`src/utils/`, because it runs client-side (parsing happens in the browser,
no round trip to the server) using the same dual Node/browser pattern as
`post-editor.js` and `imageCrop.js` - one file, tested under Node, loaded
as a plain script in the browser.

## Author/reviewer accounts: flagged, not built

This is the one item from the "left for later" list I did not build, and I
want to be upfront about why rather than silently skip it or silently
build something that cuts against a decision made all the way back in
Phase 0: this entire admin system was built around **no public sign-up,
ever** - accounts are created by hand in the Supabase dashboard, and the
admin login is a hidden URL specifically so there is nothing for the
public to find or register for.

Author and reviewer accounts are a different kind of system: public users
would need to register, submit manuscripts, and reviewers would need
their own accounts and workflow - a self-service submission portal
sitting in front of the same database. That's not a small addition on top
of what exists; it's a second, publicly-facing authentication system next
to the admin-only one, with its own security surface (open registration,
email verification, submission file uploads from untrusted users, a
review/decision workflow with its own permissions). Building that without
you confirming it's actually what you want risks a lot of wasted work in
the wrong direction, and quietly weakens the "no public accounts"
guarantee the rest of this project has been careful about.

If you do want this, it's worth its own dedicated phase with a few
decisions up front: should submission be fully self-service (public
sign-up) or invite-only (you create author accounts, same as admin
accounts now)? Do reviewers need blind/double-blind assignment, or is a
simple "admin assigns a reviewer" workflow enough? Answering those first
will make the actual build much more likely to match what you need.

## Tests added this phase (26 new, 209 total)

- `snapshotDiff.js`: 11 tests for the revision comparison logic.
- `importFormats.js`: 15 tests for the BibTeX and RIS parsers, including
  the auto-detect between them.

As with every phase, none of this was run in a live browser or against a
live server in this environment. Please click through the crop tool with a
keyboard, the revision Compare link, and the citation import box yourself.
