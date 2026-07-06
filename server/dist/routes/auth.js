"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * GET /api/auth/feishu/url
 * 获取飞书登录链接
 */
router.get('/feishu/url', (req, res) => {
    if (!(0, auth_1.isFeishuConfigured)()) {
        return res.status(503).json({
            error: '飞书 SSO 未配置',
            message: '管理员尚未配置飞书应用参数',
        });
    }
    res.json({
        url: (0, auth_1.getFeishuAuthUrl)(),
    });
});
/**
 * POST /api/auth/feishu/callback
 * 飞书 OAuth 回调
 * Body: { code: string }
 */
router.post('/feishu/callback', async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ error: '缺少 code 参数' });
        }
        const user = await (0, auth_1.exchangeFeishuCode)(code);
        const token = (0, auth_1.createSession)(user);
        res.json({
            token,
            user,
        });
    }
    catch (error) {
        console.error('飞书登录失败:', error);
        const msg = error instanceof Error ? error.message : '登录失败';
        res.status(500).json({ error: '飞书登录失败', message: msg });
    }
});
/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
router.get('/me', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: '未登录' });
    }
    const user = (0, auth_1.verifySession)(token);
    if (!user) {
        return res.status(401).json({ error: '会话已过期' });
    }
    res.json({ user });
});
exports.default = router;
