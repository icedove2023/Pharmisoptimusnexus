// src/services/cacheService.js
const NodeCache = require('node-cache');

class CacheService {
    constructor() {
        this.cache = new NodeCache({
            stdTTL: 300, // Default TTL: 5 minutes
            checkperiod: 60, // Check for expired keys every 60 seconds
            useClones: false // Don't clone objects for better performance
        });
        
        // Memory usage tracking
        this.hits = 0;
        this.misses = 0;
        this.sets = 0;
        this.deletes = 0;
    }

    /**
     * Get a value from cache
     */
    get(key) {
        const value = this.cache.get(key);
        if (value !== undefined) {
            this.hits++;
            return value;
        }
        this.misses++;
        return null;
    }

    /**
     * Set a value in cache
     */
    set(key, value, ttl = 300) {
        const success = this.cache.set(key, value, ttl);
        if (success) {
            this.sets++;
        }
        return success;
    }

    /**
     * Delete a value from cache
     */
    delete(key) {
        const count = this.cache.del(key);
        if (count > 0) {
            this.deletes++;
        }
        return count;
    }

    /**
     * Clear all cache
     */
    clear() {
        this.cache.flushAll();
        this.hits = 0;
        this.misses = 0;
        this.sets = 0;
        this.deletes = 0;
    }

    /**
     * Get cache stats
     */
    getStats() {
        return {
            keys: this.cache.keys().length,
            hits: this.hits,
            misses: this.misses,
            sets: this.sets,
            deletes: this.deletes,
            hitRate: this.hits + this.misses > 0 
                ? (this.hits / (this.hits + this.misses) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Get or set cache with async function
     */
    async getOrSet(key, fn, ttl = 300) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }
        
        const result = await fn();
        this.set(key, result, ttl);
        return result;
    }

    /**
     * Generate cache key from object
     */
    generateKey(prefix, params) {
        const sorted = Object.keys(params)
            .sort()
            .reduce((obj, key) => {
                obj[key] = params[key];
                return obj;
            }, {});
        
        return `${prefix}:${JSON.stringify(sorted)}`;
    }

    /**
     * Invalidate cache by pattern
     */
    invalidatePattern(pattern) {
        const keys = this.cache.keys().filter(key => key.startsWith(pattern));
        if (keys.length > 0) {
            this.cache.del(keys);
            this.deletes += keys.length;
        }
        return keys.length;
    }

    /**
     * Cache middleware for Express
     */
    middleware(ttl = 300) {
        return (req, res, next) => {
            const key = `route:${req.originalUrl || req.url}`;
            
            // Skip cache for POST, PUT, DELETE requests
            if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
                return next();
            }
            
            const cached = this.get(key);
            if (cached !== null) {
                // Send cached response
                return res.json(cached);
            }
            
            // Store original send method
            const originalSend = res.json.bind(res);
            res.json = (data) => {
                // Cache the response
                this.set(key, data, ttl);
                return originalSend(data);
            };
            
            next();
        };
    }
}

module.exports = new CacheService();