import { hashContent, withRetry } from "@aggregator/shared";
import type { NormalizedArticle } from "@aggregator/shared";
import type { ScraperAdapter } from "./base.js";

const SUBREDDITS = ["wallstreetbets", "stocks", "investing", "cryptocurrency", "CryptoMarkets"];
const REDDIT_API = "https://www.reddit.com";

interface RedditPost {
  data: {
    id: string;
    title: string;
    url: string;
    selftext?: string;
    author: string;
    created_utc: number;
    permalink: string;
    score: number;
    upvote_ratio: number;
    thumbnail?: string;
  };
}

interface RedditResponse {
  data: { children: RedditPost[] };
}

export class RedditScraper implements ScraperAdapter {
  readonly source = "reddit";
  readonly sourceName = "Reddit";

  private readonly userAgent =
    process.env.REDDIT_USER_AGENT ?? "aggregator/1.0";

  async fetch(): Promise<NormalizedArticle[]> {
    const results = await Promise.allSettled(
      SUBREDDITS.map((sub) => withRetry(() => this.fetchSubreddit(sub))),
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

  private async fetchSubreddit(subreddit: string): Promise<NormalizedArticle[]> {
    // Reddit JSON API — no auth needed for public subreddits
    const url = `${REDDIT_API}/r/${subreddit}/hot.json?limit=25`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": this.userAgent,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit API error for r/${subreddit}: ${response.status}`);
    }

    const json = (await response.json()) as RedditResponse;
    const posts = json.data.children;

    return posts
      .filter((p) => p.data.score > 50) // filter out very low-signal posts
      .map((p) => {
        const { data: post } = p;
        const title = post.title;
        const body = post.selftext?.slice(0, 1000) ?? "";
        const postUrl = `${REDDIT_API}${post.permalink}`;
        const contentHash = hashContent(`${title}${postUrl}${body.slice(0, 200)}`);

        // Derive rough sentiment from upvote ratio
        const sentimentScore = post.upvote_ratio * 2 - 1; // 0-1 → -1 to 1

        return {
          title: `[r/${subreddit}] ${title}`,
          url: postUrl,
          source: this.source,
          sourceName: `Reddit r/${subreddit}`,
          publishedAt: new Date(post.created_utc * 1000),
          body: body || undefined,
          author: `u/${post.author}`,
          tickersMentioned: extractTickers(title + " " + body),
          sentimentScore,
          contentHash,
        };
      });
  }
}

function extractTickers(text: string): string[] {
  const found = new Set<string>();
  // Match $AAPL or standalone uppercase 2-5 char words
  for (const m of text.matchAll(/\$([A-Z]{2,5})\b/g)) found.add(m[1]);
  return Array.from(found);
}
