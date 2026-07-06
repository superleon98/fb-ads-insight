// ========== AdLibrary 原始 API 格式 ==========

export interface AdLibraryAd {
  id: string;
  creative_key: string;
  page_id: string;
  page_name: string;
  ad_creative_bodies: string[];
  ad_creative_link_titles: string[];
  ad_creative_link_captions: string[];
  cta_type: string;
  snapshot_url: string;
  first_seen: number; // Unix timestamp
  last_seen: number;
  created_at: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  view_count: number;
  impression: number;
  platform: string[];
  geo: string[];
  fb_merge_channel: string[];
  ads_type: string; // "1"=image, "2"=video, "3"=carousel
  media_urls?: string[];
  landing_page?: string;
  ecommerce_platform?: string[];
  is_active?: boolean;
}

export interface AdLibrarySearchResponse {
  ads: AdLibraryAd[];
  total: number;
  page: number;
  pageSize: number;
  _credits: {
    used: number;
    remaining: number;
    autoCharged: boolean;
    creditsAdded: number;
  };
}

// ========== 平台定义 ==========

export type AdPlatform = 'meta' | 'google' | 'tiktok' | 'all';

export interface PlatformConfig {
  id: AdPlatform;
  name: string;
  apiPlatforms: string[]; // adlibrary.com 用的原始 platform 名称
  color: string;
}

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  meta: {
    id: 'meta',
    name: 'Meta',
    apiPlatforms: ['facebook', 'instagram'],
    color: '#1877F2',
  },
  google: {
    id: 'google',
    name: 'Google',
    apiPlatforms: ['google'],
    color: '#DB4437',
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    apiPlatforms: ['tiktok'],
    color: '#000000',
  },
};

// ========== 前端报告类型 ==========

export interface AdCreative {
  id: string;
  body: string;
  headline?: string;
  ctaType: string;
  imageUrl?: string;
  videoUrl?: string;
  format: 'image' | 'video' | 'carousel' | 'collection';
}

export interface AdData {
  id: string;
  pageName: string;
  pageId: string;
  creatives: AdCreative[];
  startDate: string;
  endDate?: string;
  status: 'ACTIVE' | 'INACTIVE';
  snapshotUrl: string;
  industries: string[];
  likeCount: number;
  commentCount: number;
  shareCount: number;
  impression: number;
  geo: string[];
  platforms: string[];
  channel: AdPlatform; // 所属渠道
}

export interface BrandMetrics {
  totalActiveAds: number;
  totalInactiveAds: number;
  estimatedMonthlySpend: { min: number; max: number };
  avgAdDuration: number;
  topIndustries: string[];
  primaryPlatforms: string[];
  topRegions: string[];
  creativeDiversity: number;
}

export interface TimelineEvent {
  date: string;
  adsLaunched: number;
  adsPaused: number;
  spendRange: [number, number];
}

export interface CreativeAnalysis {
  formatDistribution: { name: string; value: number }[];
  topKeywords: { word: string; count: number }[];
  ctaDistribution: { cta: string; count: number }[];
  avgCopyLength: number;
  sentimentScore: number;
}

export interface StrategyAnalysis {
  platformMix: { platform: string; percentage: number }[];
  regionDistribution: { country: string; percentage: number }[];
  demographicTarget: { segment: string; percentage: number }[];
  spendingPattern: 'consistent' | 'aggressive' | 'seasonal' | 'testing';
  messagingTone: string[];
}

// ========== 按渠道分组的报告 ==========

export interface ChannelReport {
  channel: AdPlatform;
  channelName: string;
  channelColor: string;
  metrics: BrandMetrics;
  creativeAnalysis: CreativeAnalysis;
  strategyAnalysis: StrategyAnalysis;
  timeline: TimelineEvent[];
  ads: AdData[];
  insights: string[];
  recommendations: string[];
}

export interface MultiPlatformReport {
  brandName: string;
  analyzedAt: string;
  dateRange: [string, string];
  channels: ChannelReport[];
  // 汇总数据
  totalAds: number;
  totalActiveAds: number;
  allPlatforms: string[];
}

// ========== Kimi AI 分析类型 ==========

export interface AIAnalysisRequest {
  brandName: string;
  ads: AdData[];
  channel: AdPlatform;
}

export interface AIAnalysisResult {
  id: string;
  brandName: string;
  channel: AdPlatform;
  channelName: string;
  analyzedAt: string;
  summary: string; // 整体策略总结
  strengths: string[]; // 优势分析
  weaknesses: string[]; // 劣势分析
  opportunities: string[]; // 机会点
  creativeInsights: string[]; // 创意洞察
  targetingInsights: string[]; // 定向洞察
  copywritingSuggestions: string[]; // 文案建议
  fullAnalysis: string; // 完整分析原文
}

// ========== 飞书 SSO 类型 ==========

export interface FeishuUser {
  openId: string;
  unionId: string;
  name: string;
  avatar: string;
  email?: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: FeishuUser | null;
  token?: string;
}
