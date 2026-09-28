-- 010_seed_team.sql
-- Seeds the team_members table with the organization's current officials,
-- previously hardcoded in views/pages/about.ejs, so the About page keeps
-- showing real people immediately after migrating rather than going blank.
-- Each is the leader of their team (or a CEC member); is_leader = true
-- marks them as such so the About page can show leadership separately from
-- each team's full membership page. Safe to run once; guarded so it does
-- nothing on a second run.

INSERT INTO team_members (name, role, bio, team_group, sort_order, is_leader, is_active)
SELECT * FROM (VALUES
    ('Adetokunbo Johnson', 'Director of Public Health', 'Passionate about pharmaceutical research and public health education.', 'Health and Wellness', 0, true, true),
    ('Adeboye Florence', 'Assistant Director of Public Health', 'Dedicated to creating engaging health content for diverse audiences.', 'Health and Wellness', 1, true, true),
    ('Agbaeze Salome', 'Public Relations Officer and Acting Secretary', 'Focused on building connections and promoting health awareness.', 'CEC', 0, true, true),
    ('Busari Aminat', 'Director of Outreach', 'Oversees the planning, coordination, and implementation of all community outreach programs, bridging the gap between pharmacy education and underserved communities through impactful health initiatives.', 'Community Outreach', 0, true, true),
    ('Olaboye Temitope', 'Clinical Lead', 'Reviews the medical accuracy of all health content and promotes evidence-based, preventive, and holistic healthcare through educational initiatives and social media campaigns.', 'Health and Wellness', 2, true, true),
    ('Ismail Hameedat', 'Wellness Officer', 'Promotes mental health awareness, healthy living, and ergonomic practices for both the community and the team.', 'Health and Wellness', 3, true, true),
    ('Lawal Shukroh', 'Creative Director and Acting Editor-in-Chief', 'Oversees all publications and serves as the final authority on written content, ensuring the organization''s voice, quality, and messaging align with its mission and goals.', 'Media and Publications', 0, true, true),
    ('Balogun Ezekiel', 'Liaison Officer', 'Serves as the primary link between the outreach team, community leaders, partner organizations, and other stakeholders, fostering effective communication and collaboration before, during, and after outreach programs.', 'Community Outreach', 1, true, true),
    ('Mustapha Yaseer', 'Logistics Coordinator', 'Manages equipment, materials, transportation, and all operational logistics required to ensure the smooth execution of outreach activities.', 'Community Outreach', 2, true, true)
) AS seed(name, role, bio, team_group, sort_order, is_leader, is_active)
WHERE NOT EXISTS (SELECT 1 FROM team_members);
