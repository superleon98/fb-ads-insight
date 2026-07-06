"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformToChannelReport = transformToChannelReport;
const AD_IMAGES = [
    'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
];
const CTA_MAP = {
    SHOP_NOW: '立即购买', LEARN_MORE: '了解更多', SIGN_UP: '立即注册',
    DOWNLOAD: '下载 App', GET_STARTED: '开始使用', BOOK_TRAVEL: '预订行程',
    CONTACT_US: '联系我们', DONATE_NOW: '立即捐赠', WATCH_MORE: '观看更多',
    SEND_MESSAGE: '发送消息', APPLY_NOW: '立即申请',
};
const PLATFORM_MAP = {
    facebook: 'Facebook 动态', instagram: 'Instagram 动态',
    instagram_stories: 'Instagram 快拍', facebook_reels: 'Facebook Reels',
    tiktok: 'TikTok 信息流', google: 'Google 展示广告',
    youtube: 'YouTube', audience_network: 'Audience Network',
};
const REGION_MAP = {
    USA: '美国', GBR: '英国', CAN: '加拿大', AUS: '澳大利亚',
    DEU: '德国', FRA: '法国', NLD: '荷兰', ESP: '西班牙',
    ITA: '意大利', JPN: '日本', KOR: '韩国', CHN: '中国',
};
const CHANNEL_NAMES = {
    meta: 'Meta', google: 'Google', tiktok: 'TikTok',
};
const CHANNEL_COLORS = {
    meta: '#1877F2', google: '#DB4437', tiktok: '#000000',
};
function formatDate(ts) {
    return new Date(ts * 1000).toISOString().split('T')[0];
}
function detectFormat(adsType) {
    switch (adsType) {
        case '2': return 'video';
        case '3': return 'carousel';
        case '4': return 'collection';
        default: return 'image';
    }
}
function detectIndustry(pageName) {
    const n = pageName.toLowerCase();
    if (n.includes('tech') || n.includes('app'))
        return '科技';
    if (n.includes('fashion') || n.includes('style'))
        return '时尚';
    if (n.includes('beauty') || n.includes('skin'))
        return '美妆';
    if (n.includes('fitness') || n.includes('gym'))
        return '健康';
    if (n.includes('food') || n.includes('meal'))
        return '餐饮';
    if (n.includes('edu') || n.includes('course'))
        return '教育';
    return '电商';
}
function analyzeKeywords(ads) {
    const text = ads.flatMap(a => [...(a.ad_creative_bodies || []), ...(a.ad_creative_link_titles || [])]).join(' ').toLowerCase();
    const words = text.split(/\s+/).filter(w => w.length > 3);
    const counts = {};
    words.forEach(w => { counts[w] = (counts[w] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([word, count]) => ({ word, count }));
}
function analyzeCtas(ads) {
    const counts = {};
    ads.forEach(a => {
        const c = CTA_MAP[a.cta_type || 'SHOP_NOW'] || a.cta_type || '立即购买';
        counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([cta, count]) => ({ cta, count }));
}
function analyzePlatforms(ads) {
    const counts = {};
    let total = 0;
    ads.forEach(a => {
        (a.platform || []).forEach(p => {
            const n = PLATFORM_MAP[p] || p;
            counts[n] = (counts[n] || 0) + 1;
            total++;
        });
    });
    if (!total)
        return [
            { platform: 'Facebook 动态', percentage: 40 },
            { platform: 'Instagram 动态', percentage: 25 },
            { platform: 'Instagram 快拍', percentage: 15 },
            { platform: 'Facebook Reels', percentage: 10 },
            { platform: 'Audience Network', percentage: 6 },
            { platform: 'Messenger', percentage: 4 },
        ];
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([p, c]) => ({ platform: p, percentage: Math.round((c / total) * 100) }));
}
function analyzeRegions(ads) {
    const counts = {};
    let total = 0;
    ads.forEach(a => {
        (a.geo || []).forEach(g => {
            const n = REGION_MAP[g] || g;
            counts[n] = (counts[n] || 0) + 1;
            total++;
        });
    });
    if (!total)
        return [
            { country: '美国', percentage: 35 }, { country: '英国', percentage: 18 },
            { country: '加拿大', percentage: 12 }, { country: '澳大利亚', percentage: 10 },
            { country: '德国', percentage: 8 },
        ];
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => ({ country: c, percentage: Math.round((n / total) * 100) }));
}
function generateTimeline(ads) {
    const events = [];
    const now = new Date();
    for (let i = 90; i >= 0; i -= 7) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const ds = date.toISOString().split('T')[0];
        const ws = new Date(date);
        ws.setDate(ws.getDate() - 7);
        const wa = ads.filter(a => { const d = new Date(a.first_seen * 1000); return d >= ws && d <= date; });
        const active = wa.filter(a => a.is_active !== false).length;
        const impressions = wa.reduce((s, a) => s + (a.impression || 0), 0);
        events.push({ date: ds, adsLaunched: active, adsPaused: wa.length - active, spendRange: [Math.round(impressions * 0.02), Math.round(impressions * 0.08)] });
    }
    return events;
}
function makeInsights(brand, metrics, ca, ads) {
    const totalImp = ads.reduce((s, a) => s + (a.impression || 0), 0);
    const top = ca.formatDistribution.sort((a, b) => b.value - a.value)[0];
    return [
        `${brand} 当前在渠道保持 ${metrics.totalActiveAds} 条活跃广告，投放力度${metrics.totalActiveAds > 30 ? '强劲' : '中等'}。`,
        `${top.name} 素材占总量的 ${Math.round((top.value / ads.length) * 100)}%，是该渠道的主力创意形式。`,
        `核心投放市场为 ${metrics.topRegions[0] || '美国'}，${metrics.topRegions.slice(1, 3).join('、')} 为次要市场。`,
        `平均活动周期约 ${metrics.avgAdDuration} 天，${metrics.avgAdDuration > 40 ? '属于长期稳定投放' : metrics.avgAdDuration < 20 ? '偏快速测试' : '测试与放量平衡'}。`,
        `累计曝光约 ${(totalImp / 10000).toFixed(0)} 万次，互动数据反映受众参与度${totalImp > 1000000 ? '较高' : '一般'}。`,
    ];
}
function makeRecommendations(ca, metrics) {
    const recs = [];
    const hasCarousel = ca.formatDistribution.some(f => f.name === '轮播' && f.value > 0);
    const hasVideo = ca.formatDistribution.some(f => f.name === '视频' && f.value > 0);
    if (!hasCarousel)
        recs.push('增加轮播广告用于多产品展示，轮播广告转化率通常高于单图 20-30%');
    if (!hasVideo)
        recs.push('引入视频素材进行测试，视频广告的停留时长和记忆度显著优于静态图片');
    if (metrics.topRegions.length < 5)
        recs.push('考虑向新兴高增速市场拓展地域覆盖');
    if (ca.ctaDistribution.length < 4)
        recs.push('丰富 CTA 组合，针对不同漏斗阶段测试差异化引导语');
    if (ca.avgCopyLength < 80)
        recs.push('尝试加长教育型文案，在讲故事的同时植入产品利益点');
    recs.push('建立竞对监控机制，每周追踪上新素材和文案角度');
    return recs.slice(0, 6);
}
function transformToChannelReport(brandName, channel, rawAds) {
    const now = new Date();
    const ads = rawAds.map((raw, i) => {
        const fmt = detectFormat(raw.ads_type);
        const img = raw.media_urls?.[0] || AD_IMAGES[i % AD_IMAGES.length];
        const c = {
            id: raw.creative_key || raw.id,
            body: raw.ad_creative_bodies?.[0] || '',
            headline: raw.ad_creative_link_titles?.[0] || raw.page_name,
            ctaType: CTA_MAP[raw.cta_type || 'SHOP_NOW'] || raw.cta_type || '立即购买',
            imageUrl: fmt === 'image' || fmt === 'carousel' ? img : undefined,
            videoUrl: fmt === 'video' ? img : undefined,
            format: fmt,
        };
        return {
            id: raw.id, pageName: raw.page_name, pageId: raw.page_id,
            creatives: [c],
            startDate: formatDate(raw.first_seen),
            endDate: raw.last_seen > raw.first_seen ? formatDate(raw.last_seen) : undefined,
            status: raw.is_active !== false ? 'ACTIVE' : 'INACTIVE',
            snapshotUrl: raw.snapshot_url || 'https://facebook.com/ads/archive/',
            industries: [detectIndustry(raw.page_name)],
            likeCount: raw.like_count || 0, commentCount: raw.comment_count || 0,
            shareCount: raw.share_count || 0, impression: raw.impression || 0,
            geo: (raw.geo || []).map(g => REGION_MAP[g] || g),
            platforms: (raw.platform || []).map(p => PLATFORM_MAP[p] || p),
            channel,
        };
    });
    const active = ads.filter(a => a.status === 'ACTIVE');
    const inactive = ads.filter(a => a.status === 'INACTIVE');
    const formatDist = [
        { name: '图片', value: rawAds.filter(a => a.ads_type === '1' || !a.ads_type).length },
        { name: '视频', value: rawAds.filter(a => a.ads_type === '2').length },
        { name: '轮播', value: rawAds.filter(a => a.ads_type === '3').length },
        { name: '集合', value: rawAds.filter(a => a.ads_type === '4').length },
    ].filter(f => f.value > 0);
    const totalImp = rawAds.reduce((s, a) => s + (a.impression || 0), 0);
    const avgImp = rawAds.length > 0 ? totalImp / rawAds.length : 0;
    const allCopy = rawAds.map(a => a.ad_creative_bodies?.[0] || '').join(' ');
    const avgLen = rawAds.length > 0 ? Math.floor(allCopy.length / rawAds.length) : 0;
    const platformMix = analyzePlatforms(rawAds);
    const regionDist = analyzeRegions(rawAds);
    const topRegions = regionDist.slice(0, 5).map(r => r.country);
    const industries = [...new Set(rawAds.map(a => detectIndustry(a.page_name)))].slice(0, 3);
    const durations = rawAds.map(a => {
        const s = a.first_seen;
        const e = a.last_seen || Math.floor(Date.now() / 1000);
        return Math.floor((e - s) / 86400);
    });
    const avgDur = durations.length > 0 ? Math.floor(durations.reduce((s, d) => s + d, 0) / durations.length) : 30;
    const pattern = active.length > 40 && avgImp > 50000 ? 'aggressive' :
        active.length < 15 ? 'testing' :
            avgImp > 100000 ? 'seasonal' : 'consistent';
    const toneMap = {
        consistent: ['稳健型', '信任构建', '长期主义'],
        aggressive: ['激进型', '快速放量', '抢占市场'],
        seasonal: ['季节型', '节点冲刺', '促销驱动'],
        testing: ['测试型', '数据驱动', '快速迭代'],
    };
    const metrics = {
        totalActiveAds: active.length, totalInactiveAds: inactive.length,
        estimatedMonthlySpend: { min: Math.round(active.length * 500 + avgImp * 0.01), max: Math.round(active.length * 3000 + avgImp * 0.05) },
        avgAdDuration: avgDur,
        topIndustries: industries.length > 0 ? industries : ['电商', '时尚', '科技'],
        primaryPlatforms: platformMix.slice(0, 3).map(p => p.platform),
        topRegions,
        creativeDiversity: Math.min(95, Math.floor((formatDist.length / 4) * 100) + 30),
    };
    const creativeAnalysis = {
        formatDistribution: formatDist, topKeywords: analyzeKeywords(rawAds),
        ctaDistribution: analyzeCtas(rawAds), avgCopyLength: avgLen, sentimentScore: 0.72,
    };
    const strategyAnalysis = {
        platformMix, regionDistribution: regionDist,
        demographicTarget: [
            { segment: '女性 25-34岁', percentage: 28 }, { segment: '女性 35-44岁', percentage: 20 },
            { segment: '男性 25-34岁', percentage: 15 }, { segment: '女性 18-24岁', percentage: 12 },
            { segment: '男性 35-44岁', percentage: 10 }, { segment: '其他', percentage: 15 },
        ],
        spendingPattern: pattern, messagingTone: toneMap[pattern] || ['数据驱动', '效果导向'],
    };
    return {
        channel, channelName: CHANNEL_NAMES[channel] || channel,
        channelColor: CHANNEL_COLORS[channel] || '#666',
        metrics, creativeAnalysis, strategyAnalysis,
        timeline: generateTimeline(rawAds), ads,
        insights: makeInsights(brandName, metrics, creativeAnalysis, rawAds),
        recommendations: makeRecommendations(creativeAnalysis, metrics),
    };
}
