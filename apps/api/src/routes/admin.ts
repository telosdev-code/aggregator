import { Router } from "express";
import { prisma } from "@aggregator/db";
import { requireInternalSecret } from "../middleware/auth.js";
import { getDailySpend } from "@aggregator/ai";

export const adminRouter = Router();
adminRouter.use(requireInternalSecret);

// GET /api/admin/stats
adminRouter.get("/stats", async (_req, res, next) => {
  try {
    const [articles, users, scraperRuns, todaySpend] = await Promise.all([
      prisma.article.count(),
      prisma.user.count(),
      prisma.scraperRun.findMany({
        take: 20,
        orderBy: { startedAt: "desc" },
      }),
      getDailySpend(),
    ]);

    const summarized = await prisma.articleSummary.count();

    res.json({
      articles,
      summarized,
      users,
      scraperRuns,
      aiSpendToday: todaySpend,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/articles/:id/hide
adminRouter.post("/articles/:id/hide", async (req, res, next) => {
  try {
    await prisma.article.update({
      where: { id: req.params.id },
      data: { isVisible: false },
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
