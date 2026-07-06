"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheMiddleware = cacheMiddleware;
exports.clearCache = clearCache;
const lru_cache_1 = require("lru-cache");
const TTL = parseInt(process.env.CACHE_TTL_MS || '300000', 10);
const cache = new lru_cache_1.LRUCache({
    max: 500,
    ttl: TTL,
});
function cacheMiddleware(prefix) {
    return (req, res, next) => {
        const key = `${prefix}:${JSON.stringify(req.body)}`;
        const cached = cache.get(key);
        if (cached) {
            res.setHeader('X-Cache', 'HIT');
            return res.json(cached.data);
        }
        const originalJson = res.json.bind(res);
        res.json = (body) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(key, { data: body, timestamp: Date.now() });
            }
            res.setHeader('X-Cache', 'MISS');
            return originalJson(body);
        };
        next();
    };
}
function clearCache() {
    cache.clear();
}
