import { Router } from "express";
import { z } from "zod";
import { prisma } from "@aggregator/db";
import { DEFAULT_PAGE_SIZE } from "@aggregator/shared";

export const articlesRouter = Router();

// GET /api/articles - global feed, newest first
articlesRouter.get("/", async (req, res, next) => {
  try {
    const query = z
      .object({
        limit: z.coerce.number().int().min(1).max(100).default(DEFAULT_PAGE_SIZE),
        offset: z.coerce.number().int().min(0).default(0),
        sentiment: z.enum(["BULLISH", "BEARISH", "NEUTRAL"]).optional(),
        impactTag: z
          .enum(["BREAKING", "EARNINGS", "ANALYST_RATING", "REGULATORY", "MACRO", "SOCIAL_BUZZ", "GENERAL"])
          .optional(),
        source: z.string().optional(),
      })
      .parse(req.query);

    const where = {
      isVisible: true,
      ...(query.impactTag && { impactTag: query.impactTag }),
      ...(query.source && { source: query.source }),
      ...(query.sentiment && { summary: { sentiment: query.sentiment } }),
    };

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        take: query.limit,
        skip: query.offset,
        orderBy: { publishedAt: "desc" },
        include: {
          summary: { select: { summary: true, sentiment: true, keyPoints: true } },
          articleTickers: {
            take: 5,
            include: { ticker: { select: { symbol: true, name: true } } },
          },
        },
      }),
      prisma.article.count({ where }),
    ]);

    res.json({
      articles: articles.map((a) => ({
        id: a.id,
        title: a.title,
        url: a.url,
        sourceName: a.sourceName,
        publishedAt: a.publishedAt,
        imageUrl: a.imageUrl,
        impactTag: a.impactTag,
        summary: a.summary ?? null,
        tickers: a.articleTickers.map((at) => at.ticker.symbol),
      })),
      total,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/articles/:id
articlesRouter.get("/:id", async (req, res, next) => {
  try {
    const article = await prisma.article.findUnique({
      where: { id: req.params.id, isVisible: true },
      include: {
        summary: true,
        articleTickers: {
          include: { ticker: { select: { symbol: true, name: true, type: true } } },
        },
      },
    });

    if (!article) {
      res.status(404).json({ error: "Article not found" });
      return;
    }

    res.json({
      ...article,
      tickers: article.articleTickers.map((at) => at.ticker),
    });
  } catch (err) {
    next(err);
  }
});
