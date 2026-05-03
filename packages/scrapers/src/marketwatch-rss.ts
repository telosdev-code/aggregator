import Parser from "rss-parser";
import { hashContent, withRetry } from "@aggregator/shared";
import type { NormalizedArticle } from "@aggregator/shared";
import type { ScraperAdapter } from "./base.js";

const MARKETWATCH_FEEDS = [
  "https://feeds.content.dowjones.io/public/rss/mw_topstories",
  "https://feeds.content.dowjones.io/public/rss/mw_marketpulse",
  "https://feeds.content.dowjones.io/public/rss/mw_realtimeheadlines",
];

export class MarketWatchRssScraper implements ScraperAdapter {
  readonly source = "marketwatch_rss";
  readonly sourceName = "MarketWatch";

  private parser = new Parser({
    customFields: { item: ["media:content"] },
  });

  async fetch(): Promise<NormalizedArticle[]> {
    const results = await Promise.allSettled(
      MARKETWATCH_FEEDS.map((url) => withRetry(() => this.fetchFeed(url))),
    );
    const articles: NormalizedArticle[] = [];
    const seen = new Set<string>();
    for (const r of results) {
      if (r.status === "rejected") continue;
      for (const a of r.value) {
        if (!seen.has(a.contentHash)) {
          seen.add(a.contentHash);
          articles.push(a);
        }
      }
    }
    return articles;
  }

  private async fetchFeed(url: string): Promise<NormalizedArticle[]> {
    const feed = await this.parser.parseURL(url);
    return feed.items
      .filter((item) => item.title && item.link)
      .map((item) => {
        const title = item.title!.trim();
        const body = stripHtml(item.contentSnippet ?? item.summary ?? "");
        const contentHash = hashContent(`${title}${item.link}${body.slice(0, 500)}`);
        return {
          title,
          url: item.link!,
          source: this.source,
          sourceName: this.sourceName,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          body: body || undefined,
          imageUrl: extractImage(item),
          author: item.author ?? undefined,
          tickersMentioned: extractTickers(title + " " + body),
          contentHash,
        };
      });
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractImage(item: Record<string, unknown>): string | undefined {
  const med = item["media:content"] as { $?: { url?: string } } | undefined;
  return med?.$?.url;
}

function extractTickers(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/\$([A-Z]{1,5})\b/g)) found.add(m[1]);
  return Array.from(found);
}
