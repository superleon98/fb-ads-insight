"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeWithKimi = analyzeWithKimi;
const axios_1 = __importDefault(require("axios"));
const API_KEY = process.env.KIMI_API_KEY;
const BASE_URL = process.env.KIMI_BASE_URL || 'https://api.moonshot.cn/v1';
const MODEL = process.env.KIMI_MODEL || 'moonshot-v1-128k';
if (!API_KEY) {
    console.warn('警告: 未设置 KIMI_API_KEY 环境变量，AI 分析功能将不可用');
}
const client = axios_1.default.create({
    baseURL: BASE_URL,
    timeout: 60000,
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
    },
});
/**
 * 将广告数据转为 Kimi 分析用的结构化文本
 */
function buildPrompt(brandName, ads, channel) {
    const channelNames = {
        meta: 'Meta (Facebook + Instagram)',
        google: 'Google Ads',
        tiktok: 'TikTok',
    };
    const samples = ads.slice(0, 15).map((ad, i) => {
        const c = ad.creatives[0];
        return `[广告${i + 1}] 标题: ${c?.headline || '无'}\n文案: ${c?.body?.slice(0, 200) || '无'}\nCTA: ${c?.ctaType || '无'}\n格式: ${c?.format || '未知'}\n状态: ${ad.status}\n地区: ${ad.geo.slice(0, 3).join(',')}\n曝光: ${ad.impression.toLocaleString()}\n点赞: ${ad.likeCount}`;
    }).join('\n\n');
    const formatDist = {};
    const ctaDist = {};
    const regionDist = {};
    ads.forEach(ad => {
        const f = ad.creatives[0]?.format || 'unknown';
        formatDist[f] = (formatDist[f] || 0) + 1;
        const cta = ad.creatives[0]?.ctaType || 'unknown';
        ctaDist[cta] = (ctaDist[cta] || 0) + 1;
        ad.geo.forEach(g => { regionDist[g] = (regionDist[g] || 0) + 1; });
    });
    return `你是一位资深海外广告营销分析师。请基于以下品牌在 ${channelNames[channel]} 的广告投放数据，进行深度策略分析。

## 品牌：${brandName}
## 渠道：${channelNames[channel]}
## 样本数量：${ads.length} 条广告

### 素材格式分布
${Object.entries(formatDist).map(([k, v]) => `${k}: ${v}条`).join('\n')}

### CTA 分布
${Object.entries(ctaDist).map(([k, v]) => `${k}: ${v}条`).join('\n')}

### 地区分布 Top 5
${Object.entries(regionDist).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => `${k}: ${v}条`).join('\n')}

### 广告样本（前15条）
${samples}

请用中文输出以下分析内容（每项用 bullet points，简洁有力）：

1. **整体策略总结**（2-3句话概括投放策略核心）
2. **优势分析**（4-5条该品牌在投放上的亮点）
3. **劣势分析**（3-4条可以改进的地方）
4. **机会点**（3-4条基于数据发现的增长机会）
5. **创意洞察**（3-4条关于素材创意的关键发现）
6. **定向洞察**（3-4条关于受众和地域定向的观察）
7. **文案建议**（3-4条可直接执行的文案优化建议）
`;
}
/**
 * 解析 Kimi 返回文本为结构化结果
 */
function parseAIResponse(text, brandName, channel) {
    const channelNames = {
        meta: 'Meta',
        google: 'Google',
        tiktok: 'TikTok',
    };
    const extractSection = (label) => {
        const regex = new RegExp(`${label}[（(]?[\d-]*[）)]?[：:]?\\s*([\\s\\S]*?)(?=\\n\d+\\.|$)`, 'i');
        const match = text.match(regex);
        if (!match)
            return [];
        return match[1]
            .split('\n')
            .map(s => s.replace(/^[-\*•\d.)\s]+/, '').trim())
            .filter(s => s.length > 5);
    };
    // 提取总结（第一段或 "整体策略总结" 部分）
    let summary = '';
    const summaryMatch = text.match(/整体策略总结[：:]?\s*(.*?)(?=\n\d+\.)/s);
    if (summaryMatch) {
        summary = summaryMatch[1].trim().split('\n').map(s => s.replace(/^[-\*•\s]+/, '').trim()).filter(Boolean).join(' ');
    }
    else {
        summary = text.split('\n').slice(0, 3).join(' ').slice(0, 200);
    }
    return {
        id: `${brandName}_${channel}_${Date.now()}`,
        brandName,
        channel,
        channelName: channelNames[channel],
        analyzedAt: new Date().toISOString(),
        summary,
        strengths: extractSection('优势分析'),
        weaknesses: extractSection('劣势分析'),
        opportunities: extractSection('机会点'),
        creativeInsights: extractSection('创意洞察'),
        targetingInsights: extractSection('定向洞察'),
        copywritingSuggestions: extractSection('文案建议'),
        fullAnalysis: text,
    };
}
/**
 * 调用 Kimi API 分析广告
 */
async function analyzeWithKimi(brandName, ads, channel) {
    if (!API_KEY) {
        throw new Error('未配置 KIMI_API_KEY');
    }
    const prompt = buildPrompt(brandName, ads, channel);
    const response = await client.post('/chat/completions', {
        model: MODEL,
        messages: [
            {
                role: 'system',
                content: '你是一位资深海外广告投放策略分析师，擅长分析 Meta、Google、TikTok 广告数据。请用中文输出，结构清晰，每条观点简明扼要。',
            },
            {
                role: 'user',
                content: prompt,
            },
        ],
        temperature: 0.7,
        max_tokens: 4000,
    });
    const text = response.data.choices?.[0]?.message?.content || '';
    if (!text) {
        throw new Error('Kimi API 返回内容为空');
    }
    return parseAIResponse(text, brandName, channel);
}
