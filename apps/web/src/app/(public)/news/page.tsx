import type { Metadata } from "next";
import { serverFetch } from "@/lib/api";
import { ArticleCard } from "@/components/news/article-card";

export const metadata: Metadata = {
  title: "Latest Stock & Crypto News",
  description: "Real-time AI-summarized financial news from Yahoo Finance, CoinGecko, Finnhub, and more.",
};

interface Article {
  id: string; title: string; url: string; sourceName: string;
  publishedAt: string; imageUrl?: string; impactTag?: string;
  summary: { summary: string; sentiment: string } | null;
  tickers: string[];
}

export default async function NewsPage() {
  let articles: Article[] = [];
  try {
    const data = await serverFetch<{ articles: Article[] }>("/api/articles?limit=24", { next: { revalidate: 60 } });
    articles = data.articles;
  } catch { /* degraded mode */ }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Latest market news</h1>
        <p className="mt-2 text-gray-500">AI-summarized articles from 6+ sources, updated every 10 minutes.</p>
      </div>
      {articles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center text-gray-400">
          No articles available. Check back shortly.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}
      <p className="mt-8 text-center text-xs text-gray-400">Not financial advice. For informational purposes only.</p>
    </div>
  );
}
