const NodeCache = require("node-cache");

// Initialize NodeCache with standard TTL of 60 seconds and cleanup check every 120 seconds
const nodeCache = new NodeCache({
    stdTTL: 60,
    checkperiod: 120,
    useClones: false // performance optimization for in-memory object references
});

// Cache statistics tracker for hits, misses, and hit rate calculation
const stats = {
    hits: 0,
    misses: 0,
    invalidations: 0
};

/**
 * Retrieve an item from the cache
 * Automatically increments hit/miss counters
 */
const getCache = (key) => {
    const data = nodeCache.get(key);
    if (data !== undefined && data !== null) {
        stats.hits += 1;
        return data;
    }
    stats.misses += 1;
    return null;
};

/**
 * Store an item in the cache with optional custom TTL (in seconds)
 */
const setCache = (key, value, ttl = 60) => {
    return nodeCache.set(key, value, ttl);
};

/**
 * Invalidate a specific cache key
 */
const delCache = (key) => {
    stats.invalidations += 1;
    return nodeCache.del(key);
};

/**
 * Invalidate all keys matching a prefix or related to a user/resource
 */
const delCacheKeys = (keys) => {
    stats.invalidations += keys.length;
    return nodeCache.del(keys);
};

/**
 * Flush all cached entries
 */
const flushAllCache = () => {
    return nodeCache.flushAll();
};

/**
 * Retrieve real-time cache analytics & debug stats
 */
const getCacheStats = () => {
    const totalRequests = stats.hits + stats.misses;
    const hitRate = totalRequests > 0 ? ((stats.hits / totalRequests) * 100).toFixed(2) : "0.00";
    const keys = nodeCache.keys();

    return {
        hits: stats.hits,
        misses: stats.misses,
        totalRequests,
        hitRate: `${hitRate}%`,
        invalidations: stats.invalidations,
        cachedKeysCount: keys.length,
        cachedKeys: keys,
        defaultTTLSeconds: 60
    };
};

module.exports = {
    nodeCache,
    getCache,
    setCache,
    delCache,
    delCacheKeys,
    flushAllCache,
    getCacheStats
};
