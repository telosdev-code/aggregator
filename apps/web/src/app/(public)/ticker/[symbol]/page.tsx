import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { serverFetch } from "@/lib/api";
import { ArticleCard } from "@/components/news/article-card";
import { SentimentBadge } from "@/components/news/sentiment-badge";
import { ImpactTagBadge } from "@/components/news/impact-tag-badge";
import { formatRelativeTime } from "@/lib/utils";

interface TickerData {
  ticker: {
    id: string;
    symbol: string;
    name: string;
    type: string;
    sector?: string;
    industry?: string;
    logoUrl?: string;
    websiteUrl?: string;
  };
  recentArticles: Array<{
    id: string;
    title: string;
    url: string;
    sourceName: string;
    publishedAt: string;
    imageUrl?: string;
    impactTag?: string;
    summary: { text: string; sentiment: string; keyPoints: string[] } | null;
  }>;
}

type Props = { params: Promise<{ symbol: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  try {
    const data = await serverFetch<TickerData>(`/api/tickers/${symbol.toUpperCase()}`);
    return {
      title: `${data.ticker.symbol} News — ${data.ticker.name}`,
      description: `Latest AI-summarized news and alerts for ${data.ticker.name} (${data.ticker.symbol}). Real-time sentiment analysis and market updates.`,
      openGraph: {
        title: `${data.ticker.symbol} News | Aggregator`,
        description: `Real-time news and AI analysis for ${data.ticker.name}`,
      },
      alternates: {
        canonical: `/ticker/${symbol.toUpperCase()}`,
      },
    };
  } catch {
    return { title: `${symbol.toUpperCase()} News` };
  }
}

export default async function TickerPage({ params }: Props) {
  const { symbol } = await params;
  const upperSymbol = symbol.toUpperCase();

  let data: TickerData;
  try {
    data = await serverFetch<TickerData>(`/api/tickers/${upperSymbol}`, {
      next: { revalidate: 60 },
    });
  } catch {
    notFound();
  }

  const { ticker, recentArticles } = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">Home</Link>
        {" / "}
        <Link href="/news" className="hover:text-gray-700">News</Link>
        {" / "}
        <span className="font-medium text-gray-900">{ticker.symbol}</span>
      </nav>

      {/* Ticker header */}
      <div className="mb-8 flex items-start gap-4">
        {ticker.logoUrl && (
          <Image
            src={ticker.logoUrl}
            alt={ticker.name}
            width={64}
            height={64}
            className="rounded-xl border border-gray-100 bg-white shadow-sm"
          />
        )}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{ticker.symbol}</h1>
            <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-600">
              {ticker.type}
            </span>
            {ticker.sector && (
              <Link
                href={`/sector/${ticker.sector.toLowerCase().replace(/\s+/g, "-")}`}
                className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700 hover:bg-blue-100"
              >
                {ticker.sector}
              </Link>
            )}
          </div>
          <p className="mt-1 text-xl text-gray-600">{ticker.name}</p>
          {ticker.websiteUrl && (
            <a
              href={ticker.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 text-sm text-blue-600 hover:underline"
            >
              {ticker.websiteUrl.replace(/^https?:\/\//, "")}
            </a>
          )}
        </div>
      </div>

      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: `${ticker.symbol} News — ${ticker.name}`,
            description: `Latest news and AI analysis for ${ticker.name}`,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/ticker/${ticker.symbol}`,
          }),
        }}
      />

      {/* News feed */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Latest news</h2>
            <span className="text-sm text-gray-500">{recentArticles.length} articles</span>
          </div>
          <div className="space-y-4">
            {recentArticles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
                No articles yet for {ticker.symbol}.
              </div>
            ) : (
              recentArticles.map((article) => (
                <article
                  key={article.id}
                  className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>{article.sourceName}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(article.publishedAt)}</span>
                        {article.impactTag && <ImpactTagBadge tag={article.impactTag} />}
                      </div>
                      <h3 className="text-base font-semibold leading-snug">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gray-900 hover:text-blue-600 transition-colors"
                        >
                          {article.title}
                        </a>
                      </h3>
                      {article.summary && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 mb-1">
                            <SentimentBadge sentiment={article.summary.sentiment} />
                            <span className="text-xs text-gray-400">AI summary</span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {article.summary.text}
                          </p>
                          {article.summary.keyPoints.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {article.summary.keyPoints.slice(0, 2).map((pt, i) => (
                                <li key={i} className="text-xs text-gray-500 flex gap-2">
                                  <span className="text-blue-400">•</span>
                                  {pt}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                    {article.imageUrl && (
                      <Image
                        src={article.imageUrl}
                        alt=""
                        width={80}
                        height={60}
                        className="shrink-0 rounded-lg object-cover"
                      />
                    )}
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold">About {ticker.symbol}</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Symbol</dt>
                <dd className="font-mono font-medium">{ticker.symbol}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Asset type</dt>
                <dd>{ticker.type}</dd>
              </div>
              {ticker.sector && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Sector</dt>
                  <dd>{ticker.sector}</dd>
                </div>
              )}
              {ticker.industry && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Industry</dt>
                  <dd>{ticker.industry}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="rounded-xl bg-blue-600 p-5 text-white">
            <h3 className="font-semibold">Get alerts for {ticker.symbol}</h3>
            <p className="mt-1 text-sm text-blue-100">
              Add to your watchlist and get instant AI-powered alerts.
            </p>
            <Link
              href="/sign-up"
              className="mt-3 block rounded-lg bg-white px-4 py-2 text-center text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
            >
              Create free account
            </Link>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-400">
            Not financial advice. Content is for informational purposes only.
          </div>
        </div>
      </div>
    </div>
  );
}
