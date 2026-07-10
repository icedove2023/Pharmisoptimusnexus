-- ============================================================
-- MIGRATION: 001_initial_schema
-- Description: Initial database setup
-- Created: 2026-06-28
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. POSTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
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

-- ============================================================
-- 2. COMMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
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

-- ============================================================
-- 3. LIKES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id VARCHAR(100),
    ip_address INET,
    session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_like UNIQUE (post_id, user_id, ip_address, session_id)
);

-- ============================================================
-- 4. VIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS views (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    referer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 5. SYNC LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS sync_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    operation VARCHAR(50),
    status VARCHAR(50),
    records_processed INTEGER DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 6. UPDATE TIMESTAMP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_comments_updated_at ON comments;
CREATE TRIGGER update_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. LOG MIGRATION
-- ============================================================
INSERT INTO sync_log (operation, status, records_processed) 
VALUES ('migration_001', 'success', 1);

-- ============================================================
-- 8. VERIFICATION
-- ============================================================
-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('posts', 'comments', 'likes', 'views', 'sync_log')
ORDER BY table_name;