import { Router } from "express";
import { z } from "zod";
import { prisma } from "@aggregator/db";
import { requireAuth } from "../middleware/auth.js";
import type { User } from "@aggregator/db";

export const usersRouter = Router();
usersRouter.use(requireAuth);

type AuthedRequest = Parameters<typeof requireAuth>[0] & { user: User };

// GET /api/users/me
usersRouter.get("/me", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const [watchlistCount, subscription] = await Promise.all([
      prisma.watchlistItem.count({ where: { userId: user.id } }),
      prisma.subscription.findUnique({ where: { userId: user.id } }),
    ]);

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      tier: user.tier,
      stripeCustomerId: user.stripeCustomerId,
      emailDigestEnabled: user.emailDigestEnabled,
      emailDigestFrequency: user.emailDigestFrequency,
      pushEnabled: user.pushEnabled,
      watchlistCount,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            trialEnd: subscription.trialEnd,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me/preferences
usersRouter.patch("/me/preferences", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const data = z
      .object({
        emailDigestEnabled: z.boolean().optional(),
        emailDigestFrequency: z.enum(["daily", "twice_daily", "instant"]).optional(),
        pushEnabled: z.boolean().optional(),
        marketingEmailEnabled: z.boolean().optional(),
      })
      .parse(req.body);

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
      select: {
        emailDigestEnabled: true,
        emailDigestFrequency: true,
        pushEnabled: true,
        marketingEmailEnabled: true,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});
