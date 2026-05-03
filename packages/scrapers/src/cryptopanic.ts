import { hashContent, withRetry } from "@aggregator/shared";
import type { NormalizedArticle } from "@aggregator/shared";
import type { ScraperAdapter } from "./base.js";

const CRYPTOPANIC_URL = "https://cryptopanic.com/api/v1/posts/";

interface CryptoPanicPost {
  id: number;
  title: string;
  url: string;
  source: { title: string; domain: string };
  published_at: string;
  currencies?: Array<{ code: string; title: string; slug: string }>;
  votes?: {
    positive: number;
    negative: number;
    important: number;
    liked: number;
    disliked: number;
    saved: number;
  };
  kind: "news" | "media" | "analysis";
}

interface CryptoPanicResponse {
  results?: CryptoPanicPost[];
}

export class CryptoPanicScraper implements ScraperAdapter {
  readonly source = "cryptopanic";
  readonly sourceName = "CryptoPanic";

  private readonly apiKey = process.env.CRYPTOPANIC_API_KEY ?? "anonymous";

  async fetch(): Promise<NormalizedArticle[]> {
    return withRetry(() => this.fetchPosts());
  }

  private async fetchPosts(): Promise<NormalizedArticle[]> {
    const params = new URLSearchParams({
      auth_token: this.apiKey,
      public: "true",
      kind: "news",
      filter: "hot",
    });

    const response = await fetch(`${CRYPTOPANIC_URL}?${params}`, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`CryptoPanic API error: ${response.status}`);
    }

    const json = (await response.json()) as CryptoPanicResponse;
    const posts = json.results ?? [];

    return posts.map((post) => {
      const title = post.title ?? "";
      const contentHash = hashContent(`${title}${post.url}`);

      const tickers = (post.currencies ?? []).map((c) => c.code);

      // Derive sentiment score from vote ratio
      const votes = post.votes;
      let sentimentScore: number | undefined;
      if (votes) {
        const total = votes.positive + votes.negative;
        if (total > 0) {
          sentimentScore = (votes.positive - votes.negative) / total;
        }
      }

      return {
        title,
        url: post.url,
        source: this.source,
        sourceName: `CryptoPanic/${post.source.title}`,
        publishedAt: new Date(post.published_at),
        tickersMentioned: tickers,
        sentimentScore,
        contentHash,
      };
    });
  }
}
