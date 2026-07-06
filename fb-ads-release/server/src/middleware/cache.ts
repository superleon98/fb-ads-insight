import { LRUCache } from 'lru-cache';
import type { Request, Response, NextFunction } from 'express';

const TTL = parseInt(process.env.CACHE_TTL_MS || '300000', 10);

const cache = new LRUCache<string, { data: unknown; timestamp: number }>({
  max: 500,
  ttl: TTL,
});

export function cacheMiddleware(prefix: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = `${prefix}:${JSON.stringify(req.body)}`;
    const cached = cache.get(key);

    if (cached) {
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached.data);
    }

    const originalJson = res.json.bind(res);
    res.json = (body: unknown) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, { data: body, timestamp: Date.now() });
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    next();
  };
}

export function clearCache() {
  cache.clear();
}
