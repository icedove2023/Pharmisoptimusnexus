-- ============================================================
-- MIGRATION: 002_add_functions
-- Description: Add database functions
-- Created: 2026-06-28
-- ============================================================

-- ============================================================
-- 1. INCREMENT VIEWS FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION increment_views(post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE posts 
    SET views = views + 1 
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. TOGGLE LIKE FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION toggle_like(
    post_id UUID, 
    session_id VARCHAR, 
    ip_address INET
)
RETURNS JSONB AS $$
DECLARE
    like_count INTEGER;
    liked BOOLEAN;
BEGIN
    -- Check if like exists
    IF EXISTS (
        SELECT 1 FROM likes 
        WHERE likes.post_id = toggle_like.post_id 
        AND likes.session_id = toggle_like.session_id
    ) THEN
        -- Remove like
        DELETE FROM likes 
        WHERE likes.post_id = toggle_like.post_id 
        AND likes.session_id = toggle_like.session_id;
        liked := false;
    ELSE
        -- Add like
        INSERT INTO likes (post_id, session_id, ip_address)
        VALUES (toggle_like.post_id, toggle_like.session_id, toggle_like.ip_address);
        liked := true;
    END IF;
    
    -- Get updated count
    SELECT COUNT(*) INTO like_count FROM likes WHERE likes.post_id = toggle_like.post_id;
    
    -- Update posts table
    UPDATE posts SET likes = like_count WHERE posts.id = toggle_like.post_id;
    
    RETURN jsonb_build_object('liked', liked, 'count', like_count);
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 3. GET POPULAR POSTS FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION get_popular_posts(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    id UUID,
    title VARCHAR,
    slug VARCHAR,
    views INTEGER,
    likes INTEGER,
    comment_count BIGINT,
    engagement_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.slug,
        p.views,
        p.likes,
        COUNT(c.id) as comment_count,
        CASE 
            WHEN p.views > 0 THEN ROUND(((p.likes + COUNT(c.id))::DECIMAL / p.views) * 100, 2)
            ELSE 0
        END as engagement_score
    FROM posts p
    LEFT JOIN comments c ON c.post_id = p.id AND c.is_approved = true
    GROUP BY p.id, p.title, p.slug, p.views, p.likes
    ORDER BY p.views DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. SYNC POSTS FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION sync_posts(
    p_google_id VARCHAR,
    p_title VARCHAR,
    p_slug VARCHAR,
    p_excerpt TEXT,
    p_content JSONB,
    p_category VARCHAR,
    p_tags TEXT[],
    p_featured BOOLEAN,
    p_published_date DATE,
    p_read_time VARCHAR,
    p_authors TEXT[],
    p_image_url VARCHAR,
    p_caption TEXT
)
RETURNS UUID AS $$
DECLARE
    v_id UUID;
BEGIN
    INSERT INTO posts (
        google_id, title, slug, excerpt, content, category, tags,
        featured, published_date, read_time, authors, image_url, caption
    ) VALUES (
        p_google_id, p_title, p_slug, p_excerpt, p_content, p_category, p_tags,
        p_featured, p_published_date, p_read_time, p_authors, p_image_url, p_caption
    )
    ON CONFLICT (slug) DO UPDATE SET
        google_id = EXCLUDED.google_id,
        title = EXCLUDED.title,
        excerpt = EXCLUDED.excerpt,
        content = EXCLUDED.content,
        category = EXCLUDED.category,
        tags = EXCLUDED.tags,
        featured = EXCLUDED.featured,
        published_date = EXCLUDED.published_date,
        read_time = EXCLUDED.read_time,
        authors = EXCLUDED.authors,
        image_url = EXCLUDED.image_url,
        caption = EXCLUDED.caption,
        updated_at = NOW()
    RETURNING id INTO v_id;
    
    -- Log sync
    INSERT INTO sync_log (operation, status, records_processed)
    VALUES ('sync_posts', 'success', 1);
    
    RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5. VERIFICATION
-- ============================================================
SELECT proname, pronargs 
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND proname IN ('increment_views', 'toggle_like', 'get_popular_posts', 'sync_posts')
ORDER BY proname;