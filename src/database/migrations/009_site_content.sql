-- 009_site_content.sql
-- Admin-managed site content: the home page hero slideshow and the About
-- page's officials/team listing. Run in the Supabase SQL editor after
-- 001-008. Safe to run more than once.

CREATE TABLE IF NOT EXISTS hero_slides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    headline TEXT,
    subtitle TEXT,
    label TEXT,
    link_url TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hero_slides_active_order ON hero_slides (is_active, sort_order);
ALTER TABLE hero_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active hero slides" ON hero_slides;
CREATE POLICY "Public can read active hero slides"
    ON hero_slides FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage hero slides" ON hero_slides;
CREATE POLICY "Admins manage hero slides"
    ON hero_slides FOR ALL
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP TRIGGER IF EXISTS update_hero_slides_updated_at ON hero_slides;
CREATE TRIGGER update_hero_slides_updated_at
    BEFORE UPDATE ON hero_slides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT,
    photo_url TEXT,
    bio TEXT,
    team_group TEXT NOT NULL DEFAULT 'Leadership',
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_team_members_active_order ON team_members (is_active, team_group, sort_order);
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active team members" ON team_members;
CREATE POLICY "Public can read active team members"
    ON team_members FOR SELECT
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins manage team members" ON team_members;
CREATE POLICY "Admins manage team members"
    ON team_members FOR ALL
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;
CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
