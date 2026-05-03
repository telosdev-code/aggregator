import type { Metadata } from "next";
import Link from "next/link";
import { serverFetch } from "@/lib/api";
import { ArticleCard } from "@/components/news/article-card";
import { TickerTape } from "@/components/ticker/ticker-tape";
import { PricingSection } from "@/components/layout/pricing-section";

export const metadata: Metadata = {
  title: "Aggregator — Real-Time Stock & Crypto News with AI Summaries",
  description:
    "Stay ahead of the market. AI-powered news alerts for stocks and crypto, personalized to your watchlist. Real-time alerts, sentiment analysis, and smart digests.",
};

interface Article {
  id: string;
  title: string;
  url: string;
  sourceName: string;
  publishedAt: string;
  imageUrl?: string;
  impactTag?: string;
  summary: { summary: string; sentiment: string; keyPoints: string[] } | null;
  tickers: string[];
}

export default async function HomePage() {
  let latestArticles: Article[] = [];
  try {
    const data = await serverFetch<{ articles: Article[] }>(
      "/api/articles?limit=6",
      { next: { revalidate: 60 } },
    );
    latestArticles = data.articles;
  } catch {
    // Render without articles if API is down
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-blue-950 text-white">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-300 ring-1 ring-blue-500/30">
              🔴 Live market intelligence
            </div>
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
              The smartest way to{" "}
              <span className="text-blue-400">follow the market</span>
            </h1>
            <p className="mt-6 text-xl text-gray-300">
              AI-curated news for every ticker in your watchlist. Real-time alerts,
              sentiment scoring, and 2-sentence summaries so you never miss what matters.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/sign-up"
                className="rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-blue-500 transition-colors"
              >
                Start free — no credit card
              </Link>
              <Link
                href="/ticker/AAPL"
                className="rounded-lg border border-white/20 bg-white/5 px-8 py-3 text-base font-semibold text-white hover:bg-white/10 transition-colors"
              >
                See a live example →
              </Link>
            </div>
          </div>
        </div>
        <TickerTape />
      </section>

      {/* Features */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: "⚡",
                title: "Real-time alerts",
                desc: "Get notified the moment breaking news hits for your watchlist tickers. Email, push, or digest — your choice.",
              },
              {
                icon: "🤖",
                title: "AI summaries",
                desc: "Every article distilled to 2-3 sentences with bullish/bearish/neutral sentiment and key catalysts extracted.",
              },
              {
                icon: "📊",
                title: "Multi-source coverage",
                desc: "We aggregate Yahoo Finance, CoinGecko, Finnhub, Alpha Vantage, CryptoPanic, CoinDesk, and more.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-2xl border border-gray-100 p-8 shadow-sm">
                <div className="text-4xl">{f.icon}</div>
                <h3 className="mt-4 text-xl font-semibold">{f.title}</h3>
                <p className="mt-2 text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest news preview */}
      {latestArticles.length > 0 && (
        <section className="bg-gray-50 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Latest market news</h2>
              <Link href="/news" className="text-sm text-blue-600 hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {latestArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      <PricingSection />

      {/* Disclaimer */}
      <div className="bg-gray-100 py-4 text-center text-xs text-gray-500">
        Not financial advice. All content is for informational purposes only.
        Always do your own research before making investment decisions.
      </div>
    </>
  );
}
