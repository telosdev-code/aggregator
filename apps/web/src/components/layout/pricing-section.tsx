import Link from "next/link";
import { TIER_CONFIG } from "@aggregator/shared";

export function PricingSection() {
  const tiers = [TIER_CONFIG.FREE, TIER_CONFIG.PRO, TIER_CONFIG.PREMIUM];
  return (
    <section id="pricing" className="bg-white py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
          <p className="mt-3 text-gray-500">Start free. Upgrade when you need more.</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`flex flex-col rounded-2xl border p-8 ${tier.id === "PRO" ? "border-blue-600 ring-2 ring-blue-600" : "border-gray-200"}`}
            >
              {tier.id === "PRO" && (
                <div className="mb-4 -mt-12 text-center">
                  <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                    Most popular
                  </span>
                </div>
              )}
              <h3 className="text-xl font-bold">{tier.name}</h3>
              <div className="mt-2">
                <span className="text-4xl font-bold">
                  {tier.priceMonthly === 0 ? "Free" : `$${tier.priceMonthly}`}
                </span>
                {tier.priceMonthly > 0 && <span className="text-gray-500">/month</span>}
              </div>
              <ul className="mt-6 flex-1 space-y-3 text-sm">
                <li className="flex gap-2">
                  <span className="text-green-500">✓</span>
                  {tier.maxWatchlistTickers === Infinity ? "Unlimited" : tier.maxWatchlistTickers} watchlist tickers
                </li>
                <li className="flex gap-2">
                  <span className={tier.realTimeAlerts ? "text-green-500" : "text-gray-300"}>
                    {tier.realTimeAlerts ? "✓" : "✗"}
                  </span>
                  Real-time alerts
                </li>
                <li className="flex gap-2">
                  <span className={!tier.showAds ? "text-green-500" : "text-gray-300"}>
                    {!tier.showAds ? "✓" : "✗"}
                  </span>
                  No ads
                </li>
                <li className="flex gap-2">
                  <span className={tier.apiAccess ? "text-green-500" : "text-gray-300"}>
                    {tier.apiAccess ? "✓" : "✗"}
                  </span>
                  API access
                </li>
                <li className="flex gap-2">
                  <span className="text-green-500">✓</span>
                  {tier.newsDelayHours === 0 ? "Real-time" : `${tier.newsDelayHours}h delayed`} news
                </li>
              </ul>
              <Link
                href="/sign-up"
                className={`mt-8 block rounded-lg px-6 py-3 text-center font-semibold transition-colors ${
                  tier.id === "PRO"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                }`}
              >
                {tier.priceMonthly === 0 ? "Get started free" : `Start ${tier.name} — 7-day trial`}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
