"use client";

import { useState } from "react";
import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { registerPushSubscription, unregisterPushSubscription } from "@/lib/push";

interface Prefs {
  emailDigestEnabled: boolean;
  emailDigestFrequency: string;
  pushEnabled: boolean;
  marketingEmailEnabled: boolean;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json());

export default function SettingsPage() {
  const { data, mutate } = useSWR<Prefs>(`${API}/api/users/me`, fetcher);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  async function save(updates: Partial<Prefs>) {
    setSaving(true);
    setSaved(false);
    await fetch(`${API}/api/users/me/preferences`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    await mutate();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!data) return <div className="p-8 text-center text-gray-400">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">Notification settings</h1>

      <div className="space-y-6">
        {/* Email digest */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Email digests</h2>
          <label className="flex items-center justify-between">
            <span className="text-sm">Receive email digests</span>
            <input
              type="checkbox"
              checked={data.emailDigestEnabled}
              onChange={(e) => save({ emailDigestEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
          </label>
          {data.emailDigestEnabled && (
            <div className="mt-4">
              <label className="text-sm text-gray-600">Frequency</label>
              <select
                value={data.emailDigestFrequency}
                onChange={(e) => save({ emailDigestFrequency: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
              >
                <option value="daily">Daily (morning + evening)</option>
                <option value="twice_daily">Twice daily</option>
                <option value="instant">Instant alerts only</option>
              </select>
            </div>
          )}
        </div>

        {/* Push notifications */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Push notifications</h2>
          <div className="flex items-center justify-between">
            <span className="text-sm">Enable push notifications</span>
            <button
              disabled={pushLoading}
              onClick={async () => {
                setPushLoading(true);
                if (data.pushEnabled) {
                  await unregisterPushSubscription();
                  await save({ pushEnabled: false });
                } else {
                  const ok = await registerPushSubscription();
                  if (ok) await save({ pushEnabled: true });
                }
                setPushLoading(false);
              }}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${data.pushEnabled ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {pushLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {data.pushEnabled ? "Enabled" : "Enable"}
            </button>
          </div>
        </div>

        {/* Marketing */}
        <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Marketing emails</h2>
          <label className="flex items-center justify-between">
            <span className="text-sm">Product updates and announcements</span>
            <input
              type="checkbox"
              checked={data.marketingEmailEnabled}
              onChange={(e) => save({ marketingEmailEnabled: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600"
            />
          </label>
        </div>

        {saving && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Saving…
          </div>
        )}
        {saved && <p className="text-sm text-green-600">✓ Saved</p>}
      </div>
    </div>
  );
}
