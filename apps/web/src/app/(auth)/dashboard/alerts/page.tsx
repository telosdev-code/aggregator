"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2, Bell, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => r.json());

type Sentiment = "BULLISH" | "BEARISH" | "NEUTRAL";
type ImpactTag = "BREAKING" | "EARNINGS" | "ANALYST_RATING" | "REGULATORY" | "MACRO" | "SOCIAL_BUZZ" | "GENERAL";
type Channel = "EMAIL" | "PUSH";

interface AlertConfig {
  id: string;
  tickerId: string | null;
  ticker: { symbol: string; name: string } | null;
  sentimentFilter: Sentiment[];
  impactTags: ImpactTag[];
  keywords: string[];
  channels: Channel[];
  frequencyCap: number;
  isActive: boolean;
}

const SENTIMENTS: Sentiment[] = ["BULLISH", "BEARISH", "NEUTRAL"];
const IMPACT_TAGS: ImpactTag[] = ["BREAKING", "EARNINGS", "ANALYST_RATING", "REGULATORY", "MACRO", "SOCIAL_BUZZ", "GENERAL"];
const CHANNELS: Channel[] = ["EMAIL", "PUSH"];

function sentimentColor(s: Sentiment) {
  return { BULLISH: "bg-green-100 text-green-800", BEARISH: "bg-red-100 text-red-800", NEUTRAL: "bg-gray-100 text-gray-700" }[s];
}

export default function AlertsPage() {
  const { data, mutate } = useSWR<{ configs: AlertConfig[] }>(`${API}/api/alerts`, fetcher);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    sentimentFilter: [] as Sentiment[],
    impactTags: [] as ImpactTag[],
    keywords: "",
    channels: ["EMAIL"] as Channel[],
    frequencyCap: 15,
    isActive: true,
  });

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  async function createAlert() {
    const keywords = form.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const res = await fetch(`${API}/api/alerts`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, keywords }),
    });

    if (res.ok) {
      await mutate();
      setCreating(false);
      setForm({ sentimentFilter: [], impactTags: [], keywords: "", channels: ["EMAIL"], frequencyCap: 15, isActive: true });
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`${API}/api/alerts/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    await mutate();
  }

  async function deleteAlert(id: string) {
    await fetch(`${API}/api/alerts/${id}`, { method: "DELETE", credentials: "include" });
    await mutate();
  }

  const configs = data?.configs ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Alert rules</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure when and how you receive news alerts for your watchlist.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> New rule
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-6">
          <h2 className="mb-4 font-semibold text-blue-900">New alert rule</h2>

          {/* Sentiment filter */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Alert on sentiment (empty = all)
            </label>
            <div className="flex flex-wrap gap-2">
              {SENTIMENTS.map((s) => (
                <button
                  key={s}
                  onClick={() => setForm((f) => ({ ...f, sentimentFilter: toggle(f.sentimentFilter, s) }))}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    form.sentimentFilter.includes(s)
                      ? sentimentColor(s)
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Impact tags */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Article types (empty = all)
            </label>
            <div className="flex flex-wrap gap-2">
              {IMPACT_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setForm((f) => ({ ...f, impactTags: toggle(f.impactTags, tag) }))}
                  className={cn(
                    "rounded px-2 py-1 text-xs font-medium border transition-colors",
                    form.impactTags.includes(tag)
                      ? "bg-blue-100 text-blue-800 border-blue-300"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300",
                  )}
                >
                  {tag.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div className="mb-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Keywords (comma-separated, optional)
            </label>
            <input
              value={form.keywords}
              onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              placeholder="earnings, guidance, acquisition…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Channels */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">Channels</label>
            <div className="flex gap-3">
              {CHANNELS.map((ch) => (
                <label key={ch} className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={form.channels.includes(ch)}
                    onChange={() => setForm((f) => ({ ...f, channels: toggle(f.channels, ch) }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  {ch}
                </label>
              ))}
            </div>
          </div>

          {/* Frequency cap */}
          <div className="mb-6">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Frequency cap: {form.frequencyCap} min between alerts
            </label>
            <input
              type="range"
              min={5}
              max={120}
              step={5}
              value={form.frequencyCap}
              onChange={(e) => setForm((f) => ({ ...f, frequencyCap: Number(e.target.value) }))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>5 min</span><span>2 hours</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={createAlert}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Save rule
            </button>
            <button
              onClick={() => setCreating(false)}
              className="rounded-lg bg-white px-5 py-2 text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Existing configs */}
      {configs.length === 0 && !creating ? (
        <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
          <Bell className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-3 text-gray-500">No alert rules yet.</p>
          <p className="text-sm text-gray-400">Create a rule to start receiving targeted alerts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((cfg) => (
            <div
              key={cfg.id}
              className={cn(
                "rounded-xl border bg-white p-5 shadow-sm transition-opacity",
                !cfg.isActive && "opacity-50",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Rule scope */}
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {cfg.ticker ? (
                      <span className="rounded bg-gray-100 px-2 py-0.5 font-mono">${cfg.ticker.symbol}</span>
                    ) : (
                      <span className="text-gray-600">All watchlist tickers</span>
                    )}
                    {!cfg.isActive && (
                      <span className="text-xs text-gray-400">(paused)</span>
                    )}
                  </div>

                  {/* Filters summary */}
                  <div className="flex flex-wrap gap-1.5">
                    {cfg.sentimentFilter.map((s) => (
                      <span key={s} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", sentimentColor(s))}>
                        {s}
                      </span>
                    ))}
                    {cfg.impactTags.map((t) => (
                      <span key={t} className="rounded bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                        {t.replace("_", " ")}
                      </span>
                    ))}
                    {cfg.keywords.map((kw) => (
                      <span key={kw} className="rounded bg-gray-50 px-2 py-0.5 text-xs font-mono text-gray-600">
                        &ldquo;{kw}&rdquo;
                      </span>
                    ))}
                    {cfg.sentimentFilter.length === 0 && cfg.impactTags.length === 0 && cfg.keywords.length === 0 && (
                      <span className="text-xs text-gray-400">All articles</span>
                    )}
                  </div>

                  <div className="text-xs text-gray-400">
                    via {cfg.channels.join(", ")} · max 1 alert per {cfg.frequencyCap} min
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActive(cfg.id, cfg.isActive)}
                    title={cfg.isActive ? "Pause" : "Resume"}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                  >
                    {cfg.isActive ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => deleteAlert(cfg.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
