"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFeishuAuthUrl = getFeishuAuthUrl;
exports.exchangeFeishuCode = exchangeFeishuCode;
exports.createSession = createSession;
exports.verifySession = verifySession;
exports.requireAuth = requireAuth;
exports.isFeishuConfigured = isFeishuConfigured;
const axios_1 = __importDefault(require("axios"));
const FEISHU_APP_ID = process.env.FEISHU_APP_ID;
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET;
const FEISHU_REDIRECT_URI = process.env.FEISHU_REDIRECT_URI || 'http://localhost:5173/login/callback';
if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    console.warn('警告: 未配置 FEISHU_APP_ID / FEISHU_APP_SECRET，飞书 SSO 不可用');
}
// 内存存储用户会话（生产环境应使用 Redis）
const sessions = new Map();
/**
 * 生成飞书授权 URL
 */
function getFeishuAuthUrl() {
    const state = Buffer.from(Date.now().toString()).toString('base64');
    const params = new URLSearchParams({
        app_id: FEISHU_APP_ID || '',
        redirect_uri: FEISHU_REDIRECT_URI,
        state,
    });
    return `https://open.feishu.cn/open-apis/authen/v1/index?${params.toString()}`;
}
/**
 * 用 code 换取 access_token 并获取用户信息
 */
async function exchangeFeishuCode(code) {
    // 1. 获取 app_access_token
    const tokenRes = await axios_1.default.post('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET,
    });
    const appAccessToken = tokenRes.data.app_access_token;
    // 2. 用 code 换 user_access_token
    const authRes = await axios_1.default.post('https://open.feishu.cn/open-apis/authen/v1/access_token', { code, grant_type: 'authorization_code' }, { headers: { Authorization: `Bearer ${appAccessToken}` } });
    const userAccessToken = authRes.data.data?.access_token;
    if (!userAccessToken) {
        throw new Error('飞书授权失败: 无法获取用户 access_token');
    }
    // 3. 获取用户信息
    const userRes = await axios_1.default.get('https://open.feishu.cn/open-apis/authen/v1/user_info', {
        headers: { Authorization: `Bearer ${userAccessToken}` },
    });
    const userData = userRes.data.data;
    return {
        openId: userData.open_id,
        unionId: userData.union_id,
        name: userData.name,
        avatar: userData.avatar_url || userData.avatar_thumb,
        email: userData.email,
    };
}
/**
 * 创建用户会话
 */
function createSession(user) {
    const token = `fs_${Buffer.from(`${user.openId}_${Date.now()}`).toString('base64')}`;
    sessions.set(token, { user, expiresAt: Date.now() + 24 * 3600 * 1000 }); // 24h
    return token;
}
/**
 * 验证会话
 */
function verifySession(token) {
    const session = sessions.get(token);
    if (!session)
        return null;
    if (Date.now() > session.expiresAt) {
        sessions.delete(token);
        return null;
    }
    return session.user;
}
/**
 * 飞书认证中间件
 * 如果飞书未配置，自动放行（所有功能免登录可用）
 */
function requireAuth(req, res, next) {
    // 飞书未配置时，直接放行
    if (!isFeishuConfigured()) {
        return next();
    }
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.auth_token;
    if (!token) {
        return res.status(401).json({ error: '未登录', message: '请先通过飞书登录' });
    }
    const user = verifySession(token);
    if (!user) {
        return res.status(401).json({ error: '会话已过期', message: '请重新登录' });
    }
    req.user = user;
    next();
}
/**
 * 飞书登录 URL 是否已配置
 */
function isFeishuConfigured() {
    return !!FEISHU_APP_ID && !!FEISHU_APP_SECRET;
}
