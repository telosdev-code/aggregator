export type AssetType = "STOCK" | "CRYPTO" | "ETF" | "INDEX";
export type Sentiment = "BULLISH" | "BEARISH" | "NEUTRAL";
export type ImpactTag =
  | "BREAKING"
  | "EARNINGS"
  | "ANALYST_RATING"
  | "REGULATORY"
  | "MACRO"
  | "SOCIAL_BUZZ"
  | "GENERAL";
export type Tier = "FREE" | "PRO" | "PREMIUM";
export type AlertChannel = "EMAIL" | "PUSH" | "TELEGRAM";

// Normalized article shape output by every scraper adapter
export interface NormalizedArticle {
  title: string;
  url: string;
  source: string;      // scraper key e.g. "yahoo_rss"
  sourceName: string;  // human label e.g. "Yahoo Finance"
  publishedAt: Date;
  body?: string;
  imageUrl?: string;
  author?: string;
  tickersMentioned: string[]; // raw symbols found before DB resolution
  sentimentScore?: number;    // pre-computed if available from API
  contentHash: string;        // SHA-256 of normalized content
}

export interface TickerDetectionResult {
  symbol: string;
  confidence: number;
  matchedAlias: string;
}

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  sentiment: Sentiment;
  catalysts: string[];
  impactTag: ImpactTag;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
}

export interface SubscriptionTier {
  id: Tier;
  name: string;
  priceMonthly: number;
  maxWatchlistTickers: number;
  realTimeAlerts: boolean;
  apiAccess: boolean;
  showAds: boolean;
  newsDelayHours: number; // 0 = real-time, 24 = day-old for free
}

export const TIER_CONFIG: Record<Tier, SubscriptionTier> = {
  FREE: {
    id: "FREE",
    name: "Free",
    priceMonthly: 0,
    maxWatchlistTickers: 3,
    realTimeAlerts: false,
    apiAccess: false,
    showAds: true,
    newsDelayHours: 24,
  },
  PRO: {
    id: "PRO",
    name: "Pro",
    priceMonthly: 19,
    maxWatchlistTickers: 50,
    realTimeAlerts: true,
    apiAccess: false,
    showAds: false,
    newsDelayHours: 0,
  },
  PREMIUM: {
    id: "PREMIUM",
    name: "Premium",
    priceMonthly: 49,
    maxWatchlistTickers: Infinity,
    realTimeAlerts: true,
    apiAccess: true,
    showAds: false,
    newsDelayHours: 0,
  },
};
