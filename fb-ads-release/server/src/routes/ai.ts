import { Router } from 'express';
import { analyzeWithKimi } from '../services/kimi';
import { rateLimit } from '../middleware/rateLimit';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * POST /api/ai/analyze
 * Kimi AI 深度分析
 * Body: { brandName: string, channel: "meta"|"google"|"tiktok", ads: AdData[] }
 * 需要登录
 */
router.post('/analyze', requireAuth, rateLimit, async (req, res) => {
  try {
    const { brandName, channel, ads } = req.body;

    if (!brandName || !channel || !ads || !Array.isArray(ads)) {
      return res.status(400).json({
        error: '缺少参数',
        message: '请提供 brandName, channel, ads 参数',
      });
    }

    if (!['meta', 'google', 'tiktok'].includes(channel)) {
      return res.status(400).json({ error: '无效渠道', message: 'channel 必须是 meta/google/tiktok' });
    }

    console.log(`[${new Date().toISOString()}] Kimi AI 分析: ${brandName} / ${channel}`);

    const result = await analyzeWithKimi(brandName, ads, channel);

    res.json(result);
  } catch (error) {
    console.error('Kimi AI 分析失败:', error);
    const msg = error instanceof Error ? error.message : '未知错误';
    res.status(500).json({ error: 'AI 分析失败', message: msg });
  }
});

/**
 * POST /api/ai/analyze-summary
 * Kimi AI 汇总分析（跨渠道对比）
 * Body: { brandName: string, channelReports: ChannelReport[] }
 */
router.post('/analyze-summary', requireAuth, rateLimit, async (req, res) => {
  try {
    const { brandName, channelReports } = req.body;

    if (!brandName || !channelReports || !Array.isArray(channelReports)) {
      return res.status(400).json({ error: '缺少参数', message: '请提供 brandName 和 channelReports' });
    }

    // 简化的汇总分析（可扩展为真正的 Kimi 调用）
    const summary = {
      brandName,
      summary: `${brandName} 在 ${channelReports.length} 个渠道均有投放。`,
      crossChannelInsights: [
        `Meta 渠道投放最为活跃，${channelReports.find(c => c.channel === 'meta')?.metrics.totalActiveAds || 0} 条广告在投`,
        `Google 渠道以搜索展示为主，品牌词覆盖度${channelReports.find(c => c.channel === 'google')?.metrics.totalActiveAds ? '良好' : '一般'}`,
        `TikTok 渠道${channelReports.find(c => c.channel === 'tiktok')?.metrics.totalActiveAds ? '已有布局，可加大视频素材投入' : '尚未检测到明显投放'}`
      ],
      recommendations: [
        '建立三渠道素材共享机制，将 Meta 高转化素材同步到 TikTok 测试',
        '利用 Google 搜索广告捕获高意向流量，配合 Meta 再营销提升转化率',
        'TikTok 原生短视频素材与 Meta 信息流素材应差异化制作，避免直接搬运'
      ],
    };

    res.json(summary);
  } catch (error) {
    console.error('汇总分析失败:', error);
    res.status(500).json({ error: '汇总分析失败', message: (error as Error).message });
  }
});

export default router;
