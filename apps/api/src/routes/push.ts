import { Router } from "express";
import { z } from "zod";
import webpush from "web-push";
import { prisma } from "@aggregator/db";
import { requireAuth } from "../middleware/auth.js";
import type { User } from "@aggregator/db";

export const pushRouter = Router();

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? "mailto:admin@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

type AuthedRequest = Parameters<typeof requireAuth>[0] & { user: User };

// GET /api/push/vapid-public-key
pushRouter.get("/vapid-public-key", (_req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY ?? "" });
});

// POST /api/push/subscribe
pushRouter.post("/subscribe", requireAuth, async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const { endpoint, keys } = z
      .object({
        endpoint: z.string().url(),
        keys: z.object({ p256dh: z.string(), auth: z.string() }),
      })
      .parse(req.body);

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { userId: user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      update: { p256dh: keys.p256dh, auth: keys.auth },
    });

    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/push/unsubscribe
pushRouter.delete("/unsubscribe", requireAuth, async (req, res, next) => {
  try {
    const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body);
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export async function sendPushNotification(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  await Promise.allSettled(
    subs.map((sub) =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
      ),
    ),
  );
}
