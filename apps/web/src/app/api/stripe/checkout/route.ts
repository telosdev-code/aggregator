import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-11-20.acacia",
});

const PRICE_MAP: Record<string, string> = {
  PRO: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? "",
};

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));

  const tier = req.nextUrl.searchParams.get("tier") ?? "PRO";
  const priceId = PRICE_MAP[tier];
  if (!priceId) return NextResponse.json({ error: "Invalid tier" }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: { trial_period_days: 7 },
    success_url: `${appUrl}/dashboard?upgrade=success`,
    cancel_url: `${appUrl}/dashboard/billing`,
    client_reference_id: userId,
    metadata: { clerkUserId: userId, tier },
  });

  return NextResponse.redirect(session.url!);
}
