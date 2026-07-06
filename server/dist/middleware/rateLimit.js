"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimit = rateLimit;
const store = {};
const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10);
function rateLimit(req, res, next) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `ratelimit:${ip}`;
    const now = Date.now();
    if (!store[key] || now > store[key].resetTime) {
        store[key] = { count: 1, resetTime: now + WINDOW_MS };
    }
    else {
        store[key].count++;
    }
    if (store[key].count > MAX_REQUESTS) {
        return res.status(429).json({
            error: '请求过于频繁',
            message: `请等待 ${Math.ceil((store[key].resetTime - now) / 1000)} 秒后重试`,
        });
    }
    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - store[key].count));
    next();
}
setInterval(() => {
    const now = Date.now();
    for (const key in store) {
        if (now > store[key].resetTime)
            delete store[key];
    }
}, 600000);
