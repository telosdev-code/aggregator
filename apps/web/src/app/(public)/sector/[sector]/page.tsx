import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { serverFetch } from "@/lib/api";
import { ArticleCard } from "@/components/news/article-card";

interface Ticker {
  id: string; symbol: string; name: string; type: string; sector?: string; logoUrl?: string; rank?: number;
}
interface Article {
  id: string; title: string; url: string; sourceName: string;
  publishedAt: string; imageUrl?: string; impactTag?: string;
  summary: { summary: string; sentiment: string } | null;
  tickers: string[];
}

type Props = { params: Promise<{ sector: string }> };

function formatSector(slug: string): string {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector } = await params;
  const label = formatSector(sector);
  return {
    title: `${label} Stocks & Crypto News`,
    description: `Latest AI-summarized news for the ${label} sector. Real-time alerts and market analysis.`,
    alternates: { canonical: `/sector/${sector}` },
  };
}

export default async function SectorPage({ params }: Props) {
  const { sector } = await params;
  const label = formatSector(sector);

  let tickers: Ticker[] = [];
  let articles: Article[] = [];

  try {
    const [tickerData, articleData] = await Promise.all([
      serverFetch<{ tickers: Ticker[] }>(`/api/tickers?sector=${encodeURIComponent(label)}&limit=20`),
      serverFetch<{ articles: Article[] }>(`/api/articles?limit=12`, { next: { revalidate: 60 } }),
    ]);
    tickers = tickerData.tickers;
    articles = articleData.articles;
  } catch {
    notFound();
  }

  if (tickers.length === 0) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-2 text-3xl font-bold">{label}</h1>
      <p className="mb-8 text-gray-500">{tickers.length} tracked assets in this sector</p>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-semibold">Latest news</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {articles.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-semibold">Tickers in {label}</h2>
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
            {tickers.map((t) => (
              <a key={t.id} href={`/ticker/${t.symbol}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                <span className="font-mono font-semibold text-sm w-12">{t.symbol}</span>
                <span className="text-sm text-gray-600 flex-1 truncate">{t.name}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
