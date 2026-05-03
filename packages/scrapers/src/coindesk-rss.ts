import Parser from "rss-parser";
import { hashContent, withRetry } from "@aggregator/shared";
import type { NormalizedArticle } from "@aggregator/shared";
import type { ScraperAdapter } from "./base.js";

const COINDESK_FEEDS = [
  "https://www.coindesk.com/arc/outboundfeeds/rss/",
  "https://decrypt.co/feed",
];

export class CoinDeskRssScraper implements ScraperAdapter {
  readonly source = "coindesk_rss";
  readonly sourceName = "CoinDesk/Decrypt";

  private parser = new Parser({
    customFields: { item: ["media:content", "enclosure"] },
  });

  async fetch(): Promise<NormalizedArticle[]> {
    const results = await Promise.allSettled(
      COINDESK_FEEDS.map((url) => withRetry(() => this.fetchFeed(url))),
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
    const label = url.includes("decrypt") ? "Decrypt" : "CoinDesk";

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
          sourceName: label,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          body: body || undefined,
          imageUrl: extractImage(item),
          author: item.author ?? undefined,
          tickersMentioned: extractCryptoMentions(title + " " + body),
          contentHash,
        };
      });
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractImage(item: Record<string, unknown>): string | undefined {
  const enc = item["enclosure"] as { url?: string } | undefined;
  if (enc?.url) return enc.url;
  const med = item["media:content"] as { $?: { url?: string } } | undefined;
  return med?.$?.url;
}

const CRYPTO_KEYWORDS: Record<string, string> = {
  bitcoin: "BTC", ethereum: "ETH", solana: "SOL", ripple: "XRP",
  xrp: "XRP", dogecoin: "DOGE", cardano: "ADA", avalanche: "AVAX",
  polkadot: "DOT", chainlink: "LINK", polygon: "MATIC", litecoin: "LTC",
  "binance coin": "BNB", bnb: "BNB", tether: "USDT", "usd coin": "USDC",
};

function extractCryptoMentions(text: string): string[] {
  const found = new Set<string>();
  const lower = text.toLowerCase();
  for (const [kw, sym] of Object.entries(CRYPTO_KEYWORDS)) {
    if (lower.includes(kw)) found.add(sym);
  }
  for (const m of text.matchAll(/\$([A-Z]{2,6})\b/g)) found.add(m[1]);
  return Array.from(found);
}
