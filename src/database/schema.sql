-- ============================================================
-- PHARMIS OPTIMUS NEXUS - Complete Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. POSTS TABLE
-- ============================================================
CREATE TABLE posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    google_id VARCHAR(50) UNIQUE,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    excerpt TEXT,
    content JSONB DEFAULT '{"sections": []}'::jsonb,
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}'::TEXT[],
    featured BOOLEAN DEFAULT FALSE,
    published_date DATE,
    read_time VARCHAR(50),
    authors TEXT[] DEFAULT '{}'::TEXT[],
    image_url VARCHAR(500),
    caption TEXT,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_category ON posts(category);
CREATE INDEX idx_posts_published_date ON posts(published_date DESC);
CREATE INDEX idx_posts_featured ON posts(featured) WHERE featured = true;

-- ============================================================
-- 2. COMMENTS TABLE
-- ============================================================
CREATE TABLE comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author VARCHAR(200) NOT NULL,
    email VARCHAR(200),
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    likes INTEGER DEFAULT 0,
    is_approved BOOLEAN DEFAULT TRUE,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at DESC);

-- ============================================================
-- 3. LIKES TABLE
-- ============================================================
CREATE TABLE likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id VARCHAR(100),
    ip_address INET,
    session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one like per user/IP per post
    CONSTRAINT unique_like UNIQUE (post_id, user_id, ip_address, session_id)
);

CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);

-- ============================================================
-- 4. VIEWS TABLE
-- ============================================================
CREATE TABLE views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_views_post_id ON views(post_id);
CREATE INDEX idx_views_session_id ON views(session_id);
CREATE INDEX idx_views_created_at ON views(created_at);

-- ============================================================
-- 5. SYNC LOG TABLE (for Google Sheets sync tracking)
-- ============================================================
CREATE TABLE sync_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    operation VARCHAR(50),
    status VARCHAR(50),
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. ANALYTICS VIEW (for easy reporting)
-- ============================================================
CREATE VIEW post_analytics AS
SELECT 
    p.id,
    p.title,
    p.slug,
    p.category,
    p.views,
    p.likes,
    (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id AND c.is_approved = true) as comment_count,
    p.published_date,
    p.created_at,
    -- Engagement rate (likes + comments) / views
    CASE 
        WHEN p.views > 0 THEN ROUND(((p.likes + (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id))::DECIMAL / p.views) * 100, 2)
        ELSE 0
    END as engagement_rate
FROM posts p;

-- ============================================================
-- 7. TRIGGERS & FUNCTIONS
-- ============================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE views ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ ACCESS (anyone can read posts, comments)
CREATE POLICY "Allow public read access to posts"
    ON posts FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to comments"
    ON comments FOR SELECT
    USING (is_approved = true);

-- PUBLIC WRITE ACCESS (anyone can create comments, likes, views)
CREATE POLICY "Allow public insert comments"
    ON comments FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public insert likes"
    ON likes FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow public insert views"
    ON views FOR INSERT
    WITH CHECK (true);

-- AUTHENTICATED USER ACCESS (for admin operations)
CREATE POLICY "Allow authenticated full access to posts"
    ON posts FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated moderate comments"
    ON comments FOR UPDATE
    USING (auth.role() = 'authenticated');

-- ============================================================
-- 9. SEED DATA (optional - for testing)
-- ============================================================

-- Insert sample categories
INSERT INTO posts (title, slug, excerpt, category, published_date, read_time, authors)
VALUES 
    ('Welcome to Pharmis Optimus Nexus', 'welcome-to-pharmis-optimus-nexus', 
     'Welcome to our platform for pharmaceutical knowledge and research.', 
     'Announcement', CURRENT_DATE, '2 mins', ARRAY['Pharmis Optimus Nexus Team'])
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 10. VERIFICATION QUERIES
-- ============================================================

-- Check all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename, indexname;

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename;