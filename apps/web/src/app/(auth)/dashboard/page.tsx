"use client";

import useSWR from "swr";
import Link from "next/link";
import { ArticleCard } from "@/components/news/article-card";
import { WatchlistManager } from "@/components/dashboard/watchlist-manager";
import { useUser } from "@clerk/nextjs";

interface UserData {
  tier: string;
  watchlistCount: number;
  subscription: { status: string; currentPeriodEnd: string } | null;
}

interface Feed { articles: Article[] }
interface Article {
  id: string; title: string; url: string; sourceName: string;
  publishedAt: string; imageUrl?: string; impactTag?: string;
  summary: { summary: string; sentiment: string } | null;
  tickers: string[];
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function apiFetcher(url: string) {
  return fetch(url, { credentials: "include" }).then((r) => r.json());
}

export default function DashboardPage() {
  const { user } = useUser();
  const { data: userData } = useSWR<UserData>(`${API}/api/users/me`, apiFetcher);
  const { data: feed } = useSWR<Feed>(`${API}/api/articles?limit=12`, apiFetcher);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
          </h1>
          <p className="mt-1 text-gray-500">
            Your personalized market intelligence dashboard
          </p>
        </div>
        {userData && (
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              userData.tier === "FREE" ? "bg-gray-100 text-gray-700" :
              userData.tier === "PRO" ? "bg-blue-100 text-blue-700" :
              "bg-purple-100 text-purple-700"
            }`}>
              {userData.tier}
            </span>
            {userData.tier === "FREE" && (
              <Link href="/dashboard/billing" className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700">
                Upgrade →
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* News feed */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Watchlist feed</h2>
          </div>
          {!feed ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          ) : feed.articles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
              <p className="text-gray-400">Add tickers to your watchlist to see your feed.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {feed.articles.map(a => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <WatchlistManager />
          <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="mb-3 font-semibold">Quick links</h3>
            <nav className="space-y-1.5 text-sm">
              <Link href="/dashboard/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                ⚙️ Notification settings
              </Link>
              <Link href="/dashboard/billing" className="flex items-center gap-2 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                💳 Billing & subscription
              </Link>
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}
