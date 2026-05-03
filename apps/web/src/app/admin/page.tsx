import { headers } from "next/headers";

const API = process.env.API_URL ?? "http://localhost:4000";

interface Stats {
  articles: number;
  summarized: number;
  users: number;
  aiSpendToday: number;
  scraperRuns: Array<{
    id: string;
    source: string;
    startedAt: string;
    completedAt: string | null;
    articlesFound: number;
    articlesNew: number;
    durationMs: number | null;
    error: string | null;
  }>;
}

async function getStats(): Promise<Stats | null> {
  try {
    const res = await fetch(`${API}/api/admin/stats`, {
      headers: { "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<Stats>;
  } catch {
    return null;
  }
}

export default async function AdminPage() {
  const stats = await getStats();

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-white">Dashboard</h1>

      {!stats ? (
        <div className="rounded-lg border border-gray-800 p-6 text-center text-gray-500">
          Could not reach API. Check that the API service is running.
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Total articles", value: stats.articles.toLocaleString() },
              { label: "Summarized", value: `${stats.summarized.toLocaleString()} (${stats.articles > 0 ? Math.round((stats.summarized / stats.articles) * 100) : 0}%)` },
              { label: "Users", value: stats.users.toLocaleString() },
              { label: "AI spend today", value: `$${stats.aiSpendToday.toFixed(4)}`, highlight: stats.aiSpendToday > 8 },
            ].map((card) => (
              <div key={card.label} className={`rounded-xl border p-5 ${card.highlight ? "border-red-800 bg-red-950" : "border-gray-800 bg-gray-900"}`}>
                <div className="text-xs font-medium uppercase tracking-wider text-gray-400">{card.label}</div>
                <div className={`mt-2 text-2xl font-bold ${card.highlight ? "text-red-400" : "text-white"}`}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Recent scraper runs */}
          <div className="rounded-xl border border-gray-800 bg-gray-900">
            <div className="border-b border-gray-800 px-5 py-3">
              <h2 className="font-semibold text-gray-200">Recent scraper runs</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-left text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-5 py-3">Source</th>
                    <th className="px-5 py-3">Started</th>
                    <th className="px-5 py-3">Found</th>
                    <th className="px-5 py-3">New</th>
                    <th className="px-5 py-3">Duration</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {stats.scraperRuns.map((run) => (
                    <tr key={run.id} className="hover:bg-gray-800/50">
                      <td className="px-5 py-3 font-mono text-gray-300">{run.source}</td>
                      <td className="px-5 py-3 text-gray-400">
                        {new Date(run.startedAt).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-3 text-gray-300">{run.articlesFound}</td>
                      <td className="px-5 py-3">
                        <span className={run.articlesNew > 0 ? "text-green-400 font-medium" : "text-gray-500"}>
                          {run.articlesNew}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-400">
                        {run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : "—"}
                      </td>
                      <td className="px-5 py-3">
                        {run.error ? (
                          <span className="rounded bg-red-900 px-2 py-0.5 text-xs text-red-300" title={run.error}>
                            error
                          </span>
                        ) : run.completedAt ? (
                          <span className="rounded bg-green-900 px-2 py-0.5 text-xs text-green-300">ok</span>
                        ) : (
                          <span className="rounded bg-yellow-900 px-2 py-0.5 text-xs text-yellow-300">running</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-600">
            Page auto-refreshes every 30s via ISR. For article moderation use{" "}
            <code className="font-mono">POST /api/admin/articles/:id/hide</code> with the internal secret.
          </p>
        </>
      )}
    </div>
  );
}
