import Parser from "rss-parser";
import { hashContent, withRetry } from "@aggregator/shared";
import type { NormalizedArticle } from "@aggregator/shared";
import type { ScraperAdapter } from "./base.js";

// Yahoo Finance exposes per-ticker RSS feeds plus a general finance feed
const YAHOO_RSS_FEEDS = [
  "https://finance.yahoo.com/news/rssindex",
  "https://finance.yahoo.com/rss/topfinstories",
];

const TICKER_FEEDS_TEMPLATE =
  "https://finance.yahoo.com/rss/headline?s={symbol}";

export class YahooRssScraper implements ScraperAdapter {
  readonly source = "yahoo_rss";
  readonly sourceName = "Yahoo Finance";

  private parser = new Parser({
    customFields: {
      item: ["media:content", "media:thumbnail", "description"],
    },
  });

  constructor(private readonly tickers: string[] = []) {}

  async fetch(): Promise<NormalizedArticle[]> {
    const urls = [
      ...YAHOO_RSS_FEEDS,
      ...this.tickers.map((t) =>
        TICKER_FEEDS_TEMPLATE.replace("{symbol}", t),
      ),
    ];

    const results = await Promise.allSettled(
      urls.map((url) => withRetry(() => this.fetchFeed(url))),
    );

    const articles: NormalizedArticle[] = [];
    const seen = new Set<string>();

    for (const result of results) {
      if (result.status === "rejected") continue;
      for (const article of result.value) {
        if (!seen.has(article.contentHash)) {
          seen.add(article.contentHash);
          articles.push(article);
        }
      }
    }

    return articles;
  }

  private async fetchFeed(url: string): Promise<NormalizedArticle[]> {
    const feed = await this.parser.parseURL(url);
    const articles: NormalizedArticle[] = [];

    for (const item of feed.items) {
      if (!item.title || !item.link) continue;

      const title = item.title.trim();
      const body = stripHtml(item.contentSnippet ?? item.description ?? "");
      const contentHash = hashContent(`${title}${item.link}${body.slice(0, 500)}`);

      articles.push({
        title,
        url: item.link,
        source: this.source,
        sourceName: this.sourceName,
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        body: body || undefined,
        imageUrl: extractImageUrl(item),
        author: item.author ?? undefined,
        tickersMentioned: extractTickers(title + " " + body),
        contentHash,
      });
    }

    return articles;
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractImageUrl(item: Record<string, unknown>): string | undefined {
  const media = item["media:content"] as { $?: { url?: string } } | undefined;
  return media?.$?.url;
}

// Lightweight pre-scraper ticker extraction — catches $AAPL or AAPL-style mentions
// Full resolution against the DB ticker list happens in the ingestion pipeline
function extractTickers(text: string): string[] {
  const matches = text.matchAll(/\$([A-Z]{1,5})(?:\b|[-.])/g);
  const found = new Set<string>();
  for (const m of matches) found.add(m[1]);
  return Array.from(found);
}
