"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchAds = searchAds;
exports.fetchAllAds = fetchAllAds;
exports.fetchAdsByChannels = fetchAdsByChannels;
const axios_1 = __importDefault(require("axios"));
const API_KEY = process.env.ADLIBRARY_API_KEY;
const BASE_URL = process.env.ADLIBRARY_BASE_URL || 'https://adlibrary.com/api';
if (!API_KEY) {
    console.warn('警告: 未设置 ADLIBRARY_API_KEY 环境变量');
}
const client = axios_1.default.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
    },
});
client.interceptors.response.use((response) => response, (error) => {
    if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        if (status === 401 || status === 403) {
            throw new Error('API 认证失败，请检查 ADLIBRARY_API_KEY');
        }
        if (status === 429)
            throw new Error('AdLibrary API 请求限流');
        if (status === 402)
            throw new Error('AdLibrary 账户积分不足');
        throw new Error(data.message || data.error || `AdLibrary API 错误 (${status})`);
    }
    if (error.request)
        throw new Error('无法连接到 AdLibrary API');
    throw new Error('请求配置错误');
});
async function searchAds(options) {
    const body = {
        keyword: options.keyword,
        appType: '3',
        pageSize: options.pageSize || 50,
        page: options.page || 1,
        daysBack: options.daysBack || 90,
    };
    if (options.platforms && options.platforms.length > 0) {
        body.platform = options.platforms;
    }
    if (options.geo)
        body.geo = options.geo;
    if (options.adsType)
        body.adsType = options.adsType;
    if (options.sortField)
        body.sortField = options.sortField;
    const response = await client.post('/search', body);
    return response.data;
}
async function fetchAllAds(options) {
    const allAds = [];
    let page = 1;
    const pageSize = 50;
    const maxPages = 4;
    while (page <= maxPages) {
        const response = await searchAds({ ...options, page, pageSize });
        if (!response.ads || response.ads.length === 0)
            break;
        allAds.push(...response.ads);
        if (response.ads.length < pageSize)
            break;
        page++;
    }
    return allAds;
}
/**
 * 按渠道并行抓取广告
 */
async function fetchAdsByChannels(keyword, channels, daysBack = 90) {
    const results = {};
    const apiPlatformMap = {
        meta: ['facebook', 'instagram'],
        google: ['google'],
        tiktok: ['tiktok'],
    };
    await Promise.all(channels.map(async (channel) => {
        try {
            const apiPlatforms = apiPlatformMap[channel];
            if (!apiPlatforms) {
                results[channel] = [];
                return;
            }
            const ads = await fetchAllAds({
                keyword,
                platforms: apiPlatforms,
                daysBack,
            });
            results[channel] = ads;
        }
        catch (err) {
            console.error(`[${channel}] 抓取失败:`, err);
            results[channel] = [];
        }
    }));
    return results;
}
