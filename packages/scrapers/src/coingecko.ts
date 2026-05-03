import { hashContent, withRetry } from "@aggregator/shared";
import type { NormalizedArticle } from "@aggregator/shared";
import type { ScraperAdapter } from "./base.js";

const COINGECKO_NEWS_URL = "https://api.coingecko.com/api/v3/news";

interface CoinGeckoNewsItem {
  title: string;
  description: string;
  url: string;
  thumb_2x?: string;
  author?: string;
  published_at: string; // ISO date string
}

interface CoinGeckoNewsResponse {
  data: CoinGeckoNewsItem[];
}

export class CoinGeckoScraper implements ScraperAdapter {
  readonly source = "coingecko";
  readonly sourceName = "CoinGecko";

  private readonly apiKey = process.env.COINGECKO_API_KEY;

  async fetch(): Promise<NormalizedArticle[]> {
    return withRetry(() => this.fetchNews());
  }

  private async fetchNews(): Promise<NormalizedArticle[]> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (this.apiKey) {
      headers["x-cg-demo-api-key"] = this.apiKey;
    }

    const url = `${COINGECKO_NEWS_URL}?per_page=50`;
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const json = (await response.json()) as CoinGeckoNewsResponse;
    const items = Array.isArray(json.data) ? json.data : [];

    return items.map((item) => {
      const title = item.title ?? "";
      const body = item.description ?? "";
      const contentHash = hashContent(`${title}${item.url}${body.slice(0, 500)}`);

      return {
        title,
        url: item.url,
        source: this.source,
        sourceName: this.sourceName,
        publishedAt: new Date(item.published_at),
        body: body || undefined,
        imageUrl: item.thumb_2x ?? undefined,
        author: item.author ?? undefined,
        tickersMentioned: extractCryptoTickers(title + " " + body),
        contentHash,
      };
    });
  }
}

// Extract crypto ticker mentions — both $BTC style and common coin names
const CRYPTO_ALIAS_MAP: Record<string, string> = {
  bitcoin: "BTC",
  ethereum: "ETH",
  solana: "SOL",
  cardano: "ADA",
  ripple: "XRP",
  xrp: "XRP",
  dogecoin: "DOGE",
  "shiba inu": "SHIB",
  avalanche: "AVAX",
  polkadot: "DOT",
  chainlink: "LINK",
  polygon: "MATIC",
  uniswap: "UNI",
  litecoin: "LTC",
};

function extractCryptoTickers(text: string): string[] {
  const found = new Set<string>();
  const lower = text.toLowerCase();

  // $SYMBOL prefix
  for (const m of text.matchAll(/\$([A-Z]{2,6})\b/g)) {
    found.add(m[1]);
  }

  // Common coin name aliases
  for (const [alias, symbol] of Object.entries(CRYPTO_ALIAS_MAP)) {
    if (lower.includes(alias)) {
      found.add(symbol);
    }
  }

  return Array.from(found);
}
