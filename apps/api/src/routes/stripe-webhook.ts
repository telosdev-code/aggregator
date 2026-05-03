import { Router, raw } from "express";
import Stripe from "stripe";
import { prisma } from "@aggregator/db";
import type { Tier, SubscriptionStatus } from "@aggregator/db";

export const stripeWebhookRouter = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-11-20.acacia",
});

const PRICE_TO_TIER: Record<string, Tier> = {
  [process.env.STRIPE_PRICE_PRO_MONTHLY ?? ""]: "PRO",
  [process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? ""]: "PREMIUM",
};

// Raw body needed for signature verification
stripeWebhookRouter.post(
  "/",
  raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET ?? "",
      );
    } catch (err) {
      res.status(400).send(`Webhook signature invalid: ${(err as Error).message}`);
      return;
    }

    // Idempotency check
    const existing = await prisma.webhookEvent.findUnique({ where: { id: event.id } });
    if (existing?.processedAt) {
      res.json({ received: true });
      return;
    }

    await prisma.webhookEvent.upsert({
      where: { id: event.id },
      create: { id: event.id, provider: "stripe", type: event.type, payload: event as object },
      update: {},
    });

    try {
      await handleStripeEvent(event);
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processedAt: new Date() },
      });
    } catch (err) {
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { error: (err as Error).message },
      });
      console.error("[stripe-webhook] handler error:", err);
    }

    res.json({ received: true });
  },
);

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    // Fired after a successful Checkout — persist the Stripe customer ID on the user
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const clerkUserId = session.metadata?.clerkUserId;
      const customerId = session.customer as string | null;
      if (clerkUserId && customerId) {
        await prisma.user.updateMany({
          where: { clerkId: clerkUserId },
          data: { stripeCustomerId: customerId },
        });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscription(sub);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: "CANCELED" },
      });
      // Downgrade user to FREE
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: sub.customer as string },
      });
      if (user) {
        await prisma.user.update({ where: { id: user.id }, data: { tier: "FREE" } });
      }
      break;
    }
  }
}

async function upsertSubscription(sub: Stripe.Subscription): Promise<void> {
  const priceId = sub.items.data[0]?.price.id ?? "";
  const tier: Tier = PRICE_TO_TIER[priceId] ?? "FREE";

  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: sub.customer as string },
  });
  if (!user) return;

  const statusMap: Record<string, SubscriptionStatus> = {
    active: "ACTIVE",
    trialing: "TRIALING",
    past_due: "PAST_DUE",
    canceled: "CANCELED",
    unpaid: "UNPAID",
    incomplete: "INCOMPLETE",
    incomplete_expired: "CANCELED",
  };

  await prisma.$transaction([
    prisma.subscription.upsert({
      where: { stripeSubscriptionId: sub.id },
      create: {
        userId: user.id,
        stripeSubscriptionId: sub.id,
        stripePriceId: priceId,
        status: statusMap[sub.status] ?? "ACTIVE",
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      },
      update: {
        status: statusMap[sub.status] ?? "ACTIVE",
        stripePriceId: priceId,
        currentPeriodStart: new Date(sub.current_period_start * 1000),
        currentPeriodEnd: new Date(sub.current_period_end * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: { tier: ["ACTIVE", "TRIALING"].includes(statusMap[sub.status] ?? "") ? tier : "FREE" },
    }),
  ]);
}
