import { Router } from "express";
import { z } from "zod";
import { prisma } from "@aggregator/db";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error-handler.js";
import type { User } from "@aggregator/db";

export const alertsRouter = Router();
alertsRouter.use(requireAuth);

type AuthedRequest = Parameters<typeof requireAuth>[0] & { user: User };

const AlertConfigSchema = z.object({
  tickerId: z.string().optional().nullable(),
  sentimentFilter: z.array(z.enum(["BULLISH", "BEARISH", "NEUTRAL"])).default([]),
  impactTags: z
    .array(z.enum(["BREAKING", "EARNINGS", "ANALYST_RATING", "REGULATORY", "MACRO", "SOCIAL_BUZZ", "GENERAL"]))
    .default([]),
  minSentimentScore: z.number().min(-1).max(1).optional().nullable(),
  keywords: z.array(z.string().min(1).max(50)).default([]),
  channels: z.array(z.enum(["EMAIL", "PUSH", "TELEGRAM"])).default(["EMAIL"]),
  frequencyCap: z.number().int().min(5).max(1440).default(15),
  isActive: z.boolean().default(true),
});

// GET /api/alerts - list configs for current user
alertsRouter.get("/", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const configs = await prisma.alertConfig.findMany({
      where: { userId: user.id },
      include: { ticker: { select: { symbol: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });
    res.json({ configs });
  } catch (err) {
    next(err);
  }
});

// POST /api/alerts
alertsRouter.post("/", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const data = AlertConfigSchema.parse(req.body);

    if (data.tickerId) {
      const ticker = await prisma.ticker.findUnique({ where: { id: data.tickerId }, select: { id: true } });
      if (!ticker) throw new AppError(404, "Ticker not found");
    }

    const config = await prisma.alertConfig.create({
      data: { userId: user.id, ...data },
      include: { ticker: { select: { symbol: true, name: true } } },
    });

    res.status(201).json({ config });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/alerts/:id
alertsRouter.patch("/:id", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const existing = await prisma.alertConfig.findFirst({
      where: { id: req.params.id, userId: user.id },
    });
    if (!existing) throw new AppError(404, "Alert config not found");

    const data = AlertConfigSchema.partial().parse(req.body);
    const updated = await prisma.alertConfig.update({
      where: { id: req.params.id },
      data,
      include: { ticker: { select: { symbol: true, name: true } } },
    });

    res.json({ config: updated });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/alerts/:id
alertsRouter.delete("/:id", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    await prisma.alertConfig.deleteMany({
      where: { id: req.params.id, userId: user.id },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
