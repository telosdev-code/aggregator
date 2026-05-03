import type { MetadataRoute } from "next";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://yourdomain.com";

const STATIC_ROUTES = [
  { url: "/", priority: 1.0, changeFrequency: "daily" as const },
  { url: "/news", priority: 0.9, changeFrequency: "hourly" as const },
  { url: "/#pricing", priority: 0.7, changeFrequency: "monthly" as const },
];

// Top tickers to include in sitemap for SEO
const TOP_TICKERS = [
  "AAPL", "MSFT", "NVDA", "AMZN", "META", "GOOGL", "TSLA", "JPM", "V",
  "WMT", "JNJ", "MA", "XOM", "HD", "PG", "BTC", "ETH", "SOL", "BNB",
  "XRP", "ADA", "AVAX", "DOGE", "MATIC", "LINK", "DOT", "NFLX", "AMD",
  "INTC", "CRM", "ADBE", "PYPL", "UBER", "COIN", "PLTR",
];

const SECTORS = [
  "technology", "healthcare", "financial-services", "consumer-cyclical",
  "energy", "communication-services", "layer-1", "defi", "layer-2",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...STATIC_ROUTES.map((r) => ({
      url: `${APP_URL}${r.url}`,
      lastModified: new Date(),
      changeFrequency: r.changeFrequency,
      priority: r.priority,
    })),
    ...TOP_TICKERS.map((symbol) => ({
      url: `${APP_URL}/ticker/${symbol}`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    ...SECTORS.map((sector) => ({
      url: `${APP_URL}/sector/${sector}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}
