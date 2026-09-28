-- 011_team_structure.sql
-- Restructures team_members into the organization's real shape: a Central
-- Executive Council (CEC) plus three teams (Health and Wellness, Media and
-- Publications, Community Outreach). Each has its own leader(s), marked with
-- is_leader; the three teams (not CEC) also get a public page listing their
-- full membership. Run after 001-010. Safe to run more than once.

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS is_leader BOOLEAN NOT NULL DEFAULT false;

-- Restrict team_group to the organization's actual structure. If this fails
-- because existing data has some other value, fix that data first (see the
-- UPDATE statements below for the mapping used when this project's seed data
-- was originally under a single "Leadership" group), then rerun.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_team_group_check') THEN
        ALTER TABLE team_members ADD CONSTRAINT team_members_team_group_check
            CHECK (team_group IN ('CEC', 'Health and Wellness', 'Media and Publications', 'Community Outreach'));
    END IF;
END $$;

-- Only relevant if 010_seed_team.sql's data ever existed under the old,
-- single "Leadership" group (an earlier draft of that seed). The current
-- 010 already inserts the correct group and is_leader for each person, so
-- on a fresh install these UPDATEs simply match zero rows.
UPDATE team_members SET team_group = 'CEC', is_leader = true
    WHERE name = 'Agbaeze Salome' AND team_group = 'Leadership';

UPDATE team_members SET team_group = 'Health and Wellness', is_leader = true
    WHERE name IN ('Adetokunbo Johnson', 'Adeboye Florence', 'Olaboye Temitope', 'Ismail Hameedat')
      AND team_group = 'Leadership';

UPDATE team_members SET team_group = 'Media and Publications', is_leader = true
    WHERE name = 'Lawal Shukroh' AND team_group = 'Leadership';

UPDATE team_members SET team_group = 'Community Outreach', is_leader = true
    WHERE name IN ('Busari Aminat', 'Balogun Ezekiel', 'Mustapha Yaseer')
      AND team_group = 'Leadership';
