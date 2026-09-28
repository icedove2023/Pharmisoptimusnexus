-- 004_restrict_admin_policies.sql
-- Run in the Supabase SQL editor. Safe to run more than once.
--
-- The original policies gave write access to ANY signed-in user. The anon key
-- is public, so if sign-ups are open anyone could create an account and edit
-- posts. These policies check app_metadata.role instead, which only the
-- dashboard or the service role key can set.

DROP POLICY IF EXISTS "Allow authenticated full access to posts" ON posts;
DROP POLICY IF EXISTS "Allow authenticated moderate comments" ON comments;
DROP POLICY IF EXISTS "Editors and admins manage posts" ON posts;
DROP POLICY IF EXISTS "Admins moderate comments" ON comments;

CREATE POLICY "Editors and admins manage posts"
    ON posts FOR ALL
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'editor'))
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'editor'));

CREATE POLICY "Admins moderate comments"
    ON comments FOR UPDATE
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
