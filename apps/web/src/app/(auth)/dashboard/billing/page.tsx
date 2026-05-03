import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BillingPortalButton } from "@/components/dashboard/billing-portal-button";
import { TIER_CONFIG } from "@aggregator/shared";

export default async function BillingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold">Billing & subscription</h1>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm mb-6">
        <h2 className="mb-4 font-semibold">Upgrade your plan</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {[TIER_CONFIG.PRO, TIER_CONFIG.PREMIUM].map((tier) => (
            <div key={tier.id} className="rounded-lg border border-gray-200 p-4">
              <div className="font-semibold">{tier.name}</div>
              <div className="text-2xl font-bold mt-1">${tier.priceMonthly}<span className="text-sm font-normal text-gray-500">/mo</span></div>
              <ul className="mt-3 space-y-1 text-sm text-gray-600">
                <li>✓ {tier.maxWatchlistTickers === Infinity ? "Unlimited" : tier.maxWatchlistTickers} tickers</li>
                {tier.realTimeAlerts && <li>✓ Real-time alerts</li>}
                {tier.apiAccess && <li>✓ API access</li>}
                <li>✓ No ads</li>
              </ul>
              <a
                href={`/api/stripe/checkout?tier=${tier.id}`}
                className="mt-4 block rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Start 7-day free trial
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-2 font-semibold">Manage existing subscription</h2>
        <p className="mb-4 text-sm text-gray-500">
          Update payment method, view invoices, or cancel your subscription.
        </p>
        <BillingPortalButton />
      </div>
    </div>
  );
}
