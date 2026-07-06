import { Router } from 'express';
import { fetchAdsByChannels } from '../services/adlibrary';
import { transformToChannelReport } from '../utils/analyzer';
import { rateLimit } from '../middleware/rateLimit';
import { cacheMiddleware } from '../middleware/cache';
import type { AdPlatform } from '../types';

const router = Router();

/**
 * POST /api/ads/analyze
 * 多渠道广告分析
 * Body: { brandName: string, channels?: ("meta"|"google"|"tiktok")[], daysBack?: number }
 */
router.post('/analyze', rateLimit, cacheMiddleware('ads'), async (req, res) => {
  try {
    const { brandName, channels = ['meta', 'google', 'tiktok'], daysBack = 90 } = req.body;

    if (!brandName || typeof brandName !== 'string') {
      return res.status(400).json({ error: '缺少参数', message: '请提供 brandName 参数' });
    }
    if (brandName.length > 100) {
      return res.status(400).json({ error: '参数过长', message: '品牌名不能超过 100 个字符' });
    }

    const validChannels = (channels as string[]).filter(c => ['meta', 'google', 'tiktok'].includes(c)) as AdPlatform[];
    if (validChannels.length === 0) {
      return res.status(400).json({ error: '无效渠道', message: 'channels 必须是 meta/google/tiktok 的组合' });
    }

    console.log(`[${new Date().toISOString()}] 分析品牌: ${brandName}, 渠道: ${validChannels.join(',')}`);

    // 并行抓取各渠道广告
    const rawByChannel = await fetchAdsByChannels(brandName, validChannels, daysBack);

    // 转换为各渠道报告
    const channelReports = validChannels.map(channel => {
      const rawAds = rawByChannel[channel] || [];
      return transformToChannelReport(brandName, channel, rawAds);
    });

    // 汇总数据
    const totalAds = channelReports.reduce((s, c) => s + c.ads.length, 0);
    const totalActive = channelReports.reduce((s, c) => s + c.metrics.totalActiveAds, 0);
    const allPlatforms = [...new Set(channelReports.flatMap(c => c.metrics.primaryPlatforms))];

    const now = new Date();
    const report = {
      brandName,
      analyzedAt: now.toISOString(),
      dateRange: [
        new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        now.toISOString().split('T')[0],
      ] as [string, string],
      channels: channelReports,
      totalAds,
      totalActiveAds: totalActive,
      allPlatforms,
    };

    res.json(report);
  } catch (error) {
    console.error('分析失败:', error);
    const msg = error instanceof Error ? error.message : '未知错误';
    res.status(500).json({ error: '分析失败', message: msg });
  }
});

/**
 * GET /api/ads/health
 */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'fb-ads-insight-server', version: '2.0.0' });
});

export default router;
