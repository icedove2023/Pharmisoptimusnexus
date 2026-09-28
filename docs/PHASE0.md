# Phase 0: Security and cleanup

## A. Do these first (manual, about 20 minutes)

### 1. Rotate every secret that was in the old zip
The old `.env` and `.env.production` files, and a template inside `scripts/test-email.js`,
contained live values. Treat them as exposed, especially if the project was ever pushed to
GitHub or shared.

- Supabase: rotate the service role (secret) key and the JWT secret in Project Settings
  (API keys / JWT settings; menu names vary by dashboard version). Update the anon key too if
  it changes.
- Gmail: revoke the old app password in your Google Account (Security > App passwords) and
  create a new one.
- Session secret: generate a new one with `node scripts/generate-secret.js`.
- Put the new values in your local `.env` and in Vercel (Project > Settings > Environment
  Variables), then redeploy.
- If the repository history contains the old files, rotating is what protects you. Rewriting
  history (git filter-repo or BFG) is optional cleanup.

### 2. Lock down sign-ups in Supabase
The anon key is public. Turn OFF "Allow new users to sign up" (Authentication > Sign In /
Providers, or Authentication > Settings). Without this, anyone can create an account, and the
old database policy treated every signed-in user as an editor.

### 3. Create the admin user by hand
1. Authentication > Users > Add user > Create new user. Enter email and a strong password and
   tick "Auto Confirm User".
2. In the SQL editor, give that user the admin role:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
where email = 'you@example.com';
```

The role lives in  `app_metadata`, which users cannot edit themselves. Use `"editor"` for
people who should write posts but not manage the site. Accounts with no role can log in but
cannot do anything.

### 4. Run the policy migration
Run `src/database/migrations/004_restrict_admin_policies.sql` in the SQL editor. It replaces
"any signed-in user can edit posts" with "only admin or editor roles". Safe to run twice.

### 5. Set SESSION_SECRET in production
The server now refuses to start in production without `SESSION_SECRET`.

### 6. Tidy dependencies (run locally, then commit the new lockfile)
These packages are not used anywhere in the code:

```
npm uninstall bcryptjs connect-pg-simple handlebars multer node-cron nodemailer-express-handlebars pg pg-hstore sequelize socket.io uuid
```

`axios` stays because the scripts in `scripts/` use it.

## B. What changed in the code

Security
- `.env` and `.env.production` removed from the project. `.env.example` added.
- `.gitignore` rewritten as UTF-8 (the old one was UTF-16 and was ignored by Git). It now also
  covers `.env.production`, which the old file missed.
- The hard-coded session secret in `scripts/test-email.js` was replaced with a placeholder.
- New `src/middleware/auth.js`: validates the Supabase access token server-side and requires
  `app_metadata.role`. The old version accepted any token.
- Now admin-only: `DELETE /api/comments/:id` and `GET /api/analytics/views`.
- `POST /api/sync` removed.
- `app.set('trust proxy', 1)`: rate limits now apply per visitor instead of one shared limit
  for the whole site on Vercel.
- Production refuses to start without `SESSION_SECRET` (no default fallback).
- The `/api/test-rate-limit` route only exists outside production.
- Removed a rate-limit exemption that relied on a session user that was never set.

Google Sheets removed
- Deleted the sync service, auto-sync timer, sync route, sync script entry and config keys.
- `/api/hero-slides` now returns an empty list, so the home page shows its three built-in
  slides until the slideshow becomes an admin feature (Phase 4).
- You can delete `GOOGLE_SHEETS_*`, `ENABLE_AUTO_SYNC` and `SYNC_INTERVAL` from Vercel.
- Existing posts stay in Supabase untouched.

Cleanup
- Removed empty or orphaned files: `config/database.js`, `public/js/analytics.js`,
  `public/js/likes.js`, `components/likes.ejs`, `vercel-build.js`, unused realtime client.
- All emoji removed from JavaScript, EJS and scripts. Icons in views now come from
  `src/utils/icons.js` (Feather/Lucide paths as inline SVG): `<%- icon('heart') %>`.
- Test scripts print `[PASS]`, `[FAIL]`, `[WARN]` instead of emoji.

Tests (`npm test`)
- Auth middleware: no token, bad token, no role, role spoofed in user metadata, admin, editor,
  Supabase outage.
- Icon helper.
- A guard test that fails if emoji are added to the code again.

## C. Known items deliberately left for later phases
- Views and likes are still broken as audited. Rebuilt in Phase 1.
- The contact form only writes to the server log; it does not email or store messages, and
  the log contains the visitor's name, email and message. Recommend storing messages in a
  table and emailing a notification in Phase 1.
- `adminController.js` is not routed. It is replaced by the admin area in Phase 1.
- `v1/` (old static site) is git-ignored but still contains three Google Apps Script URLs.
  Delete the folder if you no longer need it.
- Typographic arrows in link text ("Read More →") are plain text characters, not emoji,
  and were kept.
