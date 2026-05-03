import { hashContent, withRetry } from "@aggregator/shared";
import type { NormalizedArticle } from "@aggregator/shared";
import type { ScraperAdapter } from "./base.js";

const AV_NEWS_URL = "https://www.alphavantage.co/query";

interface AlphaVantageNewsItem {
  title: string;
  url: string;
  time_published: string; // "20250115T143022"
  authors?: string[];
  summary: string;
  banner_image?: string;
  source: string;
  overall_sentiment_score?: number;
  overall_sentiment_label?: string;
  ticker_sentiment?: Array<{
    ticker: string;
    relevance_score: string;
    ticker_sentiment_score: string;
    ticker_sentiment_label: string;
  }>;
}

interface AlphaVantageResponse {
  feed?: AlphaVantageNewsItem[];
}

export class AlphaVantageScraper implements ScraperAdapter {
  readonly source = "alpha_vantage";
  readonly sourceName = "Alpha Vantage";

  private readonly apiKey = process.env.ALPHA_VANTAGE_API_KEY ?? "";

  async fetch(): Promise<NormalizedArticle[]> {
    if (!this.apiKey) {
      console.warn("[alpha_vantage] ALPHA_VANTAGE_API_KEY not set, skipping");
      return [];
    }
    return withRetry(() => this.fetchNews());
  }

  private async fetchNews(): Promise<NormalizedArticle[]> {
    const params = new URLSearchParams({
      function: "NEWS_SENTIMENT",
      apikey: this.apiKey,
      limit: "50",
      sort: "LATEST",
    });

    const response = await fetch(`${AV_NEWS_URL}?${params}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }

    const json = (await response.json()) as AlphaVantageResponse;
    const items = json.feed ?? [];

    return items.map((item) => {
      const title = item.title ?? "";
      const body = item.summary ?? "";
      const contentHash = hashContent(`${title}${item.url}${body.slice(0, 500)}`);

      const tickers = (item.ticker_sentiment ?? [])
        .filter((t) => parseFloat(t.relevance_score) > 0.3)
        .map((t) => t.ticker);

      return {
        title,
        url: item.url,
        source: this.source,
        sourceName: `AV/${item.source}`,
        publishedAt: parseAlphaVantageDate(item.time_published),
        body: body || undefined,
        imageUrl: item.banner_image ?? undefined,
        author: item.authors?.join(", ") ?? undefined,
        tickersMentioned: tickers,
        sentimentScore: item.overall_sentiment_score,
        contentHash,
      };
    });
  }
}

// "20250115T143022" → Date
function parseAlphaVantageDate(str: string): Date {
  const iso = `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}T${str.slice(9, 11)}:${str.slice(11, 13)}:${str.slice(13, 15)}Z`;
  return new Date(iso);
}
