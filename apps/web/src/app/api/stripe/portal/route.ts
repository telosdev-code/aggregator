import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-11-20.acacia",
});

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Look up stripe customer ID via the backend API
  const apiUrl = process.env.API_URL ?? "http://localhost:4000";
  const userRes = await fetch(`${apiUrl}/api/users/me`, {
    headers: { "x-clerk-user-id": userId },
  });

  if (!userRes.ok) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const user = await userRes.json() as { stripeCustomerId?: string };

  if (!user.stripeCustomerId) {
    return NextResponse.json({ error: "No billing account found" }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl}/dashboard/billing`,
  });

  return NextResponse.json({ url: session.url });
}
