# Phase 1: Foundation - admin login, blog/publication separation, real views and likes

This phase does not touch page design. Blog and publication pages look the same
as before; what changed is underneath: the database, the admin area, and how
views/likes/contact are handled. Phases 2 and 3 will build the actual post
editor and redesign the blog and journal pages.

## Setup (do this before testing)

1. **Run the migration.** In the Supabase SQL editor, run
   `src/database/migrations/005_phase1_foundation.sql` (after 004 from Phase 0).
   It adds `kind` and `status` to `posts`, backfills `kind` from the old
   category list so nothing changes on the site, and adds the views/likes/
   contact tables and functions.
2. **Set `ADMIN_PATH` in `.env`** to something private, e.g. `/nx-admin-7f2`.
   If you skip this, it defaults to `/studio`. Nothing on the site links to it;
   you type the address directly.
3. **Set `SESSION_SECRET`** if you have not already (Phase 0). It is now also
   used to hash the anonymous visitor cookie and IP addresses, so changing it
   later resets everyone's like/view de-duplication.
4. `npm install` (a few unused packages were removed from `package.json`;
   `express-session` is gone too, since sessions are no longer used).
5. `npm test`, then `npm run dev` and sign in at `http://localhost:3000` +
   your `ADMIN_PATH` + `/login` with the admin account from Phase 0.

## What admins can do right now

- Sign in at `ADMIN_PATH/login` with the Supabase account created in Phase 0.
- See an overview: published/draft counts, total views and likes, comments,
  and (admin role only) new contact messages.
- See every post, filter by type/status/title, and change a post's status
  (draft, scheduled, published, archived) from a dropdown.
- Read and triage contact messages (admin role only): new, read, archived.
- Sign out.

Creating and editing post content is not here yet — that is Phase 2 (blogs)
and Phase 3 (publications). This phase gives editors a place to publish or
unpublish what already exists, and gives admins visibility into the site.

## How admin sign-in works

- Accounts are created manually in Supabase (Phase 0), with role in
  `app_metadata` (`admin` or `editor`) — not something a user can change
  themselves.
- Signing in calls Supabase Auth directly and stores the access and refresh
  tokens in httpOnly cookies scoped to `ADMIN_PATH`, so the public site and its
  JavaScript never see them. A valid Supabase login with no `admin`/`editor`
  role is treated exactly like a wrong password.
- Cookies are `SameSite=Strict`, and every state-changing admin request
  (anything that is not a plain page load) is also checked to have come from
  your own site (`Origin`/`Referer` must match `Host`).
- Failed sign-in attempts are rate-limited per IP; successful ones are not.
- The whole admin area sends `X-Robots-Tag: noindex, nofollow` and
  `Cache-Control: no-store`.
- There is still no server-side session store (correct for Vercel's serverless
  functions): the admin's identity is re-checked against Supabase on every
  request from the token in the cookie, with the refresh token used to renew
  it silently when the access token has expired.

## Blogs vs publications

Posts now have `kind` ('blog' or 'publication') as a real column, set once and
read directly — not guessed from `category` on every request the way the old
code did. The migration backfills it using the same category list the old
code used, so nothing changes for existing posts.

`posts.status` controls visibility: only `published` posts appear on the
public site (enforced by the database, not just application code). A post
under `blog/:slug` that turns out to be a publication (or the reverse)
redirects to the correct section, the same as before.

## Views and likes, rebuilt

Old behavior: no session cookie was ever issued, so every request looked like
a new visitor, views were counted twice per page load, and the database
functions could not write to `likes`/`posts` because they ran with the
visitor's own (very limited) permissions.

New behavior:
- Every visitor gets a random, anonymous cookie (`pon_vid`) on their first
  request. The database never sees the raw value, only a keyed hash of it, so
  it cannot be linked back to a person or reused outside this site.
- A view is counted once per visitor per post per day, only after the browser
  has kept the article open and visible for a few seconds, and only for
  requests that do not look like a crawler or scripted tool.
- A like is one-per-visitor-per-post, toggled by a real button (works with
  keyboard and screen readers, unlike the old emoji `<span>`).
- Both are written through two database functions
  (`record_post_view`, `toggle_post_like`) that run with elevated database
  permissions but are only callable by the server, so the totals on `posts`
  cannot be edited by anyone browsing the site directly.
- The admin analytics endpoint now reads real daily totals from the
  `post_views` table instead of an empty stub.

## Contact form

Messages are saved to a new `contact_messages` table (readable only by the
server) before an email notification is attempted, so a message is never lost
if email happens to be down. A hidden field was added that real visitors never
fill in; the sandbox couldn't verify a live SMTP send, but the create + best
effort email path is unit-testable and covered by the existing email service.

## Cleanup that shipped alongside this

- `middleware/cache.js` and `services/analyticsService.js` were dead code
  (defined, never wired into any route) and used `req.session`, which no
  longer exists now that `express-session` is removed. Deleted both, along
  with the now-empty `services/cacheService.js` and `services/index.js` that
  only they used.
- `express-session` and the packages listed in Phase 0 removed from
  `package.json`.

## Tests (`npm test`, 35 total)

- Auth token validation (from Phase 0).
- Icon helper and the no-emoji guard (from Phase 0).
- Cookie parsing, the visitor/IP hashing, UUID and bot detection.
- Admin path validation (rejects reserved or malformed values).
- The admin session guard: no cookie, wrong role, valid admin, refreshing an
  expired token, an invalid refresh token, and the same-origin check on
  state-changing requests.

None of this was run against a live server or a live Supabase project in this
environment (no network access here) — please run `npm install`, `npm test`,
and a manual click-through after applying the migration.

## Known gaps, deliberately left for later phases

- No post editor yet (Phase 2/3). Admins can only change status on existing
  posts.
- No password reset flow. For now, reset a forgotten admin password from the
  Supabase dashboard.
- No audit log of who changed what.
- Slideshow, About page, and team management are still hardcoded (Phase 4).
- `years`/`currentYear` are still passed into the publications page but no
  filter control in the template actually uses them; left alone since it is
  not connected to anything broken, and Phase 3 will redo that page anyway.
