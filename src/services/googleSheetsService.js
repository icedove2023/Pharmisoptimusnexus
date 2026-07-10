// src/services/googleSheetsService.js
const axios = require('axios');
const { Post } = require('../models');
const { generateSlug, ensureUniqueSlug } = require('../utils/slugify');
const config = require('../config');

class GoogleSheetsService {
    constructor() {
        this.PUBLICATIONS_URL = config.googleSheets.publicationsUrl;
        this.BLOG_URL = config.googleSheets.blogUrl;
        this.syncInterval = null;
        this.isSyncing = false;
    }

    /**
     * Fetch data from Google Sheets
     */
    async fetchSheetData(url) {
        try {
            console.log(`📊 Fetching data from: ${url}`);
            const response = await axios.get(url, {
                timeout: 30000, // 30 seconds timeout
                headers: {
                    'Accept': 'application/json'
                }
            });
            
            let data = response.data;
            
            if (typeof data === 'string') {
                try {
                    data = JSON.parse(data);
                } catch (e) {
                    console.error('Failed to parse JSON response:', e);
                    throw new Error('Invalid JSON response from Google Sheets');
                }
            }

            const extractArray = (value) => {
                if (Array.isArray(value)) return value;
                if (!value || typeof value !== 'object') return null;

                for (const key of ['data', 'rows', 'records', 'items', 'values', 'result', 'results']) {
                    if (Array.isArray(value[key])) return value[key];
                }

                const nestedValues = Object.values(value).filter(v => Array.isArray(v));
                if (nestedValues.length > 0) return nestedValues[0];

                return null;
            };

            data = extractArray(data) || [];
            
            console.log(`✅ Fetched ${data.length || 0} records from Google Sheets`);
            return data || [];
        } catch (error) {
            console.error('❌ Error fetching Google Sheets data:', error.message);
            if (error.response) {
                console.error('Response status:', error.response.status);
                console.error('Response data:', error.response.data);
            }
            throw new Error(`Failed to fetch data from Google Sheets: ${error.message}`);
        }
    }

    /**
     * Generate slug from title
     */
    generateSlug(title) {
        if (!title) return '';
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    /**
     * Parse tags from string or array
     */
    parseTags(tags) {
        if (!tags) return [];
        if (Array.isArray(tags)) return tags.map(t => t.trim()).filter(t => t);
        if (typeof tags === 'string') {
            return tags.split(',').map(t => t.trim()).filter(t => t);
        }
        return [];
    }

    /**
     * Parse authors from string or array
     */
    parseAuthors(authors) {
        if (!authors) return ['Pharmis Optimus Nexus'];
        if (Array.isArray(authors)) return authors.map(a => a.trim()).filter(a => a);
        if (typeof authors === 'string') {
            return authors.split(',').map(a => a.trim()).filter(a => a);
        }
        return ['Pharmis Optimus Nexus'];
    }

    /**
     * Normalize incoming dates from Google Sheets into a database-safe format
     */
    normalizeDate(value) {
        if (!value) return new Date().toISOString().split('T')[0];

        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return value.toISOString().split('T')[0];
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return new Date().toISOString().split('T')[0];

            const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}$/);
            if (isoMatch) return trimmed;

            const parsed = new Date(trimmed);
            if (!Number.isNaN(parsed.getTime())) {
                return parsed.toISOString().split('T')[0];
            }
        }

        return new Date().toISOString().split('T')[0];
    }

    /**
     * Parse content from JSON or string
     */
    parseContent(content) {
        if (!content) return { sections: [] };
        
        // If it's already an object, return it
        if (typeof content === 'object') return content;
        
        // Try to parse as JSON
        try {
            const parsed = JSON.parse(content);
            return parsed;
        } catch (e) {
            // If not JSON, wrap in a paragraph
            return {
                sections: [
                    {
                        type: 'paragraph',
                        text: content
                    }
                ]
            };
        }
    }

    /**
     * Sync publications from Google Sheets
     */
    async syncPublications() {
        if (this.isSyncing) {
            console.log('⚠️ Sync already in progress, skipping...');
            return { created: 0, updated: 0, errors: 0, skipped: true };
        }

        this.isSyncing = true;
        console.log('🔄 Starting publications sync...');
        
        let created = 0, updated = 0, errors = 0;

        try {
            const data = await this.fetchSheetData(this.PUBLICATIONS_URL);
            
            if (!data || data.length === 0) {
                console.warn('⚠️ No data returned from Google Sheets');
                return { created: 0, updated: 0, errors: 0, message: 'No data found' };
            }

            // Process each row
            for (const row of data) {
                try {
                    // Skip empty rows
                    if (!row.title && !row.id) continue;
                    
                    // Generate slug
                    const baseSlug = this.generateSlug(row.title || 'untitled');
                    const slug = await ensureUniqueSlug(baseSlug, row.id);
                    
                    const publishedDate = this.normalizeDate(row.published_date || row.date || row.year || null);

                    // Prepare post data
                    const postData = {
                        google_id: row.id || null,
                        title: row.title || 'Untitled',
                        slug: slug,
                        excerpt: row.excerpt || row.abstract || '',
                        content: this.parseContent(row.content || row.abstract || ''),
                        category: row.cat || row.category || 'Others',
                        tags: this.parseTags(row.tags || ''),
                        featured: row.featured === 'yes' || row.featured === true,
                        published_date: publishedDate,
                        read_time: row.read || row.read_time || '5 mins',
                        authors: this.parseAuthors(row.authors || row.author || ''),
                        image_url: row.image || row.image_url || null,
                        caption: row.caption || null
                    };

                    // Upsert post
                    const result = await Post.upsert(postData);
                    
                    if (result && result.length > 0) {
                        // Check if it was created or updated
                        const existing = await Post.findBySlug(slug);
                        if (existing && existing.created_at === existing.updated_at) {
                            created++;
                        } else {
                            updated++;
                        }
                    }
                } catch (rowError) {
                    console.error('Error processing row:', rowError);
                    errors++;
                }
            }

            console.log(`✅ Publications sync complete: ${created} created, ${updated} updated, ${errors} errors`);
            return { created, updated, errors };
        } catch (error) {
            console.error('❌ Publications sync failed:', error);
            return { created: 0, updated: 0, errors: 1, error: error.message };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Sync blog posts from Google Sheets
     */
    async syncBlogPosts() {
        if (this.isSyncing) {
            console.log('⚠️ Sync already in progress, skipping...');
            return { created: 0, updated: 0, errors: 0, skipped: true };
        }

        this.isSyncing = true;
        console.log('🔄 Starting blog sync...');
        
        let created = 0, updated = 0, errors = 0;

        try {
            const data = await this.fetchSheetData(this.BLOG_URL);
            
            if (!data || data.length === 0) {
                console.warn('⚠️ No blog data returned from Google Sheets');
                return { created: 0, updated: 0, errors: 0, message: 'No data found' };
            }

            // Process each row
            for (const row of data) {
                try {
                    // Skip empty rows
                    if (!row.title && !row.id) continue;
                    
                    // Generate slug
                    const baseSlug = this.generateSlug(row.title || 'untitled');
                    const slug = await ensureUniqueSlug(baseSlug, row.id);
                    
                    // Parse content
                    let content = row.content;
                    if (typeof content === 'string') {
                        try {
                            content = JSON.parse(content);
                        } catch (e) {
                            // If not valid JSON, wrap in sections
                            content = {
                                sections: [
                                    {
                                        type: 'paragraph',
                                        text: content
                                    }
                                ]
                            };
                        }
                    }
                    
                    const publishedDate = this.normalizeDate(row.published_date || row.date || row.year || null);

                    // Prepare post data
                    const postData = {
                        google_id: row.id || null,
                        title: row.title || 'Untitled',
                        slug: slug,
                        excerpt: row.excerpt || '',
                        content: content || { sections: [] },
                        category: row.cat || row.category || 'Uncategorized',
                        tags: this.parseTags(row.tags || ''),
                        featured: row.featured === 'yes' || row.featured === true,
                        published_date: publishedDate,
                        read_time: row.read || row.read_time || '5 mins',
                        authors: this.parseAuthors(row.authors || row.author || ''),
                        image_url: row.image || row.image_url || null,
                        caption: row.caption || null
                    };

                    // Upsert post
                    const result = await Post.upsert(postData);
                    
                    if (result && result.length > 0) {
                        const existing = await Post.findBySlug(slug);
                        if (existing && existing.created_at === existing.updated_at) {
                            created++;
                        } else {
                            updated++;
                        }
                    }
                } catch (rowError) {
                    console.error('Error processing blog row:', rowError);
                    errors++;
                }
            }

            console.log(`✅ Blog sync complete: ${created} created, ${updated} updated, ${errors} errors`);
            return { created, updated, errors };
        } catch (error) {
            console.error('❌ Blog sync failed:', error);
            return { created: 0, updated: 0, errors: 1, error: error.message };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Full sync (both publications and blogs)
     */
    async fullSync() {
        console.log('🔄 Starting full sync...');
        
        try {
            const publications = await this.syncPublications();
            const blogs = await this.syncBlogPosts();
            
            console.log('✅ Full sync complete');
            return { 
                publications, 
                blogs,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Full sync failed:', error);
            throw error;
        }
    }

    /**
     * Start auto-sync
     */
    startAutoSync(intervalMs = 3600000) { // Default: 1 hour
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
        }
        
        this.syncInterval = setInterval(async () => {
            try {
                await this.fullSync();
            } catch (error) {
                console.error('Auto-sync error:', error);
            }
        }, intervalMs);
        
        console.log(`🔄 Auto-sync started (interval: ${intervalMs / 1000}s)`);
    }

    /**
     * Stop auto-sync
     */
    stopAutoSync() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏹️ Auto-sync stopped');
        }
    }
}

module.exports = new GoogleSheetsService();