export const SCRAPER_SOURCES = {
  YAHOO_RSS: "yahoo_rss",
  FINNHUB: "finnhub",
  ALPHA_VANTAGE: "alpha_vantage",
  MARKETWATCH_RSS: "marketwatch_rss",
  COINGECKO: "coingecko",
  CRYPTOPANIC: "cryptopanic",
  COINDESK_RSS: "coindesk_rss",
  REDDIT: "reddit",
} as const;

export type ScraperSource = (typeof SCRAPER_SOURCES)[keyof typeof SCRAPER_SOURCES];

// BullMQ queue names
export const QUEUES = {
  SCRAPE: "scrape",
  SUMMARIZE: "summarize",
  ALERT: "alert",
  EMAIL_DIGEST: "email-digest",
} as const;

// Redis key prefixes
export const CACHE_KEYS = {
  TICKER_NEWS: (symbol: string) => `ticker:${symbol.toLowerCase()}:news`,
  ARTICLE: (id: string) => `article:${id}`,
  TICKER_META: (symbol: string) => `ticker:${symbol.toLowerCase()}:meta`,
  SECTOR_NEWS: (sector: string) => `sector:${sector.toLowerCase()}:news`,
  RATE_LIMIT: (source: string) => `ratelimit:${source}`,
} as const;

export const CACHE_TTL = {
  TICKER_NEWS: 5 * 60,        // 5 minutes
  ARTICLE: 10 * 60,           // 10 minutes
  TICKER_META: 60 * 60,       // 1 hour
  SECTOR_NEWS: 5 * 60,        // 5 minutes
} as const;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
