import { Router } from "express";
import { z } from "zod";
import { prisma } from "@aggregator/db";
import { requireAuth } from "../middleware/auth.js";
import { AppError } from "../middleware/error-handler.js";
import { TIER_CONFIG } from "@aggregator/shared";
import type { User } from "@aggregator/db";

export const watchlistRouter = Router();
watchlistRouter.use(requireAuth);

type AuthedRequest = Parameters<typeof requireAuth>[0] & { user: User };

// GET /api/watchlist
watchlistRouter.get("/", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const items = await prisma.watchlistItem.findMany({
      where: { userId: user.id },
      orderBy: { sortOrder: "asc" },
      include: { ticker: { select: { symbol: true, name: true, type: true, logoUrl: true, sector: true } } },
    });
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// POST /api/watchlist
watchlistRouter.post("/", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const { symbol } = z.object({ symbol: z.string().min(1).max(10) }).parse(req.body);

    const tierConfig = TIER_CONFIG[user.tier];
    const currentCount = await prisma.watchlistItem.count({ where: { userId: user.id } });
    if (currentCount >= tierConfig.maxWatchlistTickers) {
      throw new AppError(
        403,
        `Your ${tierConfig.name} plan allows up to ${tierConfig.maxWatchlistTickers} tickers. Upgrade to add more.`,
      );
    }

    const ticker = await prisma.ticker.findUnique({
      where: { symbol: symbol.toUpperCase() },
      select: { id: true, symbol: true, name: true },
    });
    if (!ticker) throw new AppError(404, `Ticker ${symbol} not found`);

    const existing = await prisma.watchlistItem.findUnique({
      where: { userId_tickerId: { userId: user.id, tickerId: ticker.id } },
    });
    if (existing) throw new AppError(409, "Already in watchlist");

    const maxOrder = await prisma.watchlistItem.aggregate({
      where: { userId: user.id },
      _max: { sortOrder: true },
    });

    const item = await prisma.watchlistItem.create({
      data: {
        userId: user.id,
        tickerId: ticker.id,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      include: { ticker: { select: { symbol: true, name: true, type: true, logoUrl: true } } },
    });

    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/watchlist/:symbol
watchlistRouter.delete("/:symbol", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const symbol = req.params.symbol.toUpperCase();

    const ticker = await prisma.ticker.findUnique({
      where: { symbol },
      select: { id: true },
    });
    if (!ticker) throw new AppError(404, "Ticker not found");

    await prisma.watchlistItem.deleteMany({
      where: { userId: user.id, tickerId: ticker.id },
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// PATCH /api/watchlist/reorder
watchlistRouter.patch("/reorder", async (req, res, next) => {
  try {
    const user = (req as unknown as AuthedRequest).user;
    const { order } = z
      .object({ order: z.array(z.string()) }) // array of ticker symbols in new order
      .parse(req.body);

    const tickers = await prisma.ticker.findMany({
      where: { symbol: { in: order } },
      select: { id: true, symbol: true },
    });

    await prisma.$transaction(
      tickers.map((t) =>
        prisma.watchlistItem.updateMany({
          where: { userId: user.id, tickerId: t.id },
          data: { sortOrder: order.indexOf(t.symbol) },
        }),
      ),
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
