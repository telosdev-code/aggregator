"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { X, Plus, Loader2 } from "lucide-react";

interface WatchlistItem {
  id: string;
  ticker: { symbol: string; name: string; type: string; logoUrl?: string };
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function apiFetcher(url: string) {
  return fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("Fetch failed");
    return r.json();
  });
}

export function WatchlistManager() {
  const { data, mutate } = useSWR<{ items: WatchlistItem[] }>(
    `${API}/api/watchlist`,
    apiFetcher,
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function addTicker() {
    const symbol = input.trim().toUpperCase().replace("$", "");
    if (!symbol) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/watchlist`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to add");
      }
      setInput("");
      await mutate();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function removeTicker(symbol: string) {
    await fetch(`${API}/api/watchlist/${symbol}`, {
      method: "DELETE",
      credentials: "include",
    });
    await mutate();
  }

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-semibold">My Watchlist</h3>

      {/* Add input */}
      <div className="mb-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTicker()}
          placeholder="AAPL, BTC…"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
        <button
          onClick={addTicker}
          disabled={loading || !input.trim()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      {/* List */}
      {!data ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-gray-100" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">
          No tickers yet. Search above to add.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {data.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-gray-50"
            >
              <Link href={`/ticker/${item.ticker.symbol}`} className="flex items-center gap-2 text-sm">
                <span className="font-mono font-semibold text-gray-900">{item.ticker.symbol}</span>
                <span className="text-gray-500 text-xs truncate max-w-[100px]">{item.ticker.name}</span>
              </Link>
              <button
                onClick={() => removeTicker(item.ticker.symbol)}
                className="rounded p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
