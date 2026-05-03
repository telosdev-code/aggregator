import { hashContent, withRetry } from "@aggregator/shared";
import type { NormalizedArticle } from "@aggregator/shared";
import type { ScraperAdapter } from "./base.js";

const FINNHUB_NEWS_URL = "https://finnhub.io/api/v1/news?category=general";

interface FinnhubNewsItem {
  id: number;
  headline: string;
  summary: string;
  url: string;
  image?: string;
  source: string;
  datetime: number; // unix timestamp
  related?: string; // comma-separated tickers
}

export class FinnhubScraper implements ScraperAdapter {
  readonly source = "finnhub";
  readonly sourceName = "Finnhub";

  private readonly apiKey = process.env.FINNHUB_API_KEY ?? "";

  async fetch(): Promise<NormalizedArticle[]> {
    if (!this.apiKey) {
      console.warn("[finnhub] FINNHUB_API_KEY not set, skipping");
      return [];
    }
    return withRetry(() => this.fetchNews());
  }

  private async fetchNews(): Promise<NormalizedArticle[]> {
    const url = `${FINNHUB_NEWS_URL}&token=${this.apiKey}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const items = (await response.json()) as FinnhubNewsItem[];

    return items.map((item) => {
      const title = item.headline ?? "";
      const body = item.summary ?? "";
      const contentHash = hashContent(`${title}${item.url}${body.slice(0, 500)}`);

      const relatedTickers = item.related
        ? item.related.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

      return {
        title,
        url: item.url,
        source: this.source,
        sourceName: `Finnhub/${item.source}`,
        publishedAt: new Date(item.datetime * 1000),
        body: body || undefined,
        imageUrl: item.image ?? undefined,
        tickersMentioned: relatedTickers,
        contentHash,
      };
    });
  }
}
