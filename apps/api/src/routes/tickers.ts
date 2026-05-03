import { Router } from "express";
import { z } from "zod";
import { prisma } from "@aggregator/db";
import { CACHE_KEYS, CACHE_TTL, DEFAULT_PAGE_SIZE } from "@aggregator/shared";
import { cacheGet, cacheSet } from "../services/redis.js";

export const tickersRouter = Router();

// GET /api/tickers - list all active tickers with optional filters
tickersRouter.get("/", async (req, res, next) => {
  try {
    const query = z
      .object({
        type: z.enum(["STOCK", "CRYPTO", "ETF", "INDEX"]).optional(),
        sector: z.string().optional(),
        q: z.string().optional(),
        limit: z.coerce.number().int().min(1).max(100).default(50),
        offset: z.coerce.number().int().min(0).default(0),
      })
      .parse(req.query);

    const where = {
      isActive: true,
      ...(query.type && { type: query.type }),
      ...(query.sector && { sector: { contains: query.sector, mode: "insensitive" as const } }),
      ...(query.q && {
        OR: [
          { symbol: { contains: query.q.toUpperCase() } },
          { name: { contains: query.q, mode: "insensitive" as const } },
        ],
      }),
    };

    const [tickers, total] = await Promise.all([
      prisma.ticker.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: [{ rank: "asc" }, { symbol: "asc" }],
        select: { id: true, symbol: true, name: true, type: true, sector: true, logoUrl: true, rank: true },
      }),
      prisma.ticker.count({ where }),
    ]);

    res.json({ tickers, total, limit: query.limit, offset: query.offset });
  } catch (err) {
    next(err);
  }
});

// GET /api/tickers/:symbol - ticker detail + recent news
tickersRouter.get("/:symbol", async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const cacheKey = CACHE_KEYS.TICKER_META(symbol);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const ticker = await prisma.ticker.findUnique({
      where: { symbol },
      include: {
        articleTickers: {
          take: 20,
          orderBy: { createdAt: "desc" },
          include: {
            article: {
              include: { summary: true },
            },
          },
          where: { article: { isVisible: true } },
        },
      },
    });

    if (!ticker) {
      res.status(404).json({ error: "Ticker not found" });
      return;
    }

    const payload = {
      ticker: {
        id: ticker.id,
        symbol: ticker.symbol,
        name: ticker.name,
        type: ticker.type,
        sector: ticker.sector,
        industry: ticker.industry,
        logoUrl: ticker.logoUrl,
        websiteUrl: ticker.websiteUrl,
      },
      recentArticles: ticker.articleTickers.map((at) => ({
        id: at.article.id,
        title: at.article.title,
        url: at.article.url,
        sourceName: at.article.sourceName,
        publishedAt: at.article.publishedAt,
        imageUrl: at.article.imageUrl,
        impactTag: at.article.impactTag,
        summary: at.article.summary
          ? {
              text: at.article.summary.summary,
              sentiment: at.article.summary.sentiment,
              keyPoints: at.article.summary.keyPoints,
            }
          : null,
      })),
    };

    await cacheSet(cacheKey, payload, CACHE_TTL.TICKER_META);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

// GET /api/tickers/:symbol/news - paginated news feed
tickersRouter.get("/:symbol/news", async (req, res, next) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const { limit = DEFAULT_PAGE_SIZE, offset = 0, sentiment } = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(DEFAULT_PAGE_SIZE),
        offset: z.coerce.number().int().min(0).default(0),
        sentiment: z.enum(["BULLISH", "BEARISH", "NEUTRAL"]).optional(),
      })
      .parse(req.query);

    const ticker = await prisma.ticker.findUnique({ where: { symbol }, select: { id: true } });
    if (!ticker) {
      res.status(404).json({ error: "Ticker not found" });
      return;
    }

    const where = {
      tickerId: ticker.id,
      article: {
        isVisible: true,
        ...(sentiment && { summary: { sentiment } }),
      },
    };

    const [items, total] = await Promise.all([
      prisma.articleTicker.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: {
          article: {
            include: { summary: { select: { summary: true, sentiment: true, keyPoints: true } } },
          },
        },
      }),
      prisma.articleTicker.count({ where }),
    ]);

    res.json({
      articles: items.map((i) => ({
        id: i.article.id,
        title: i.article.title,
        url: i.article.url,
        sourceName: i.article.sourceName,
        publishedAt: i.article.publishedAt,
        imageUrl: i.article.imageUrl,
        impactTag: i.article.impactTag,
        summary: i.article.summary ?? null,
      })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});
