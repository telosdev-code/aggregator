import { Worker } from "bullmq";
import pino from "pino";
import { prisma } from "@aggregator/db";
import { QUEUES } from "@aggregator/shared";
import { getConnection } from "../lib/queue.js";
import { sendAlertEmail } from "../lib/email.js";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

export function startAlertWorker(): void {
  const worker = new Worker(
    QUEUES.ALERT,
    async (job) => {
      const { articleId } = job.data as { articleId: string };

      const article = await prisma.article.findUnique({
        where: { id: articleId },
        include: {
          summary: true,
          articleTickers: { include: { ticker: true } },
        },
      });

      if (!article?.summary) return;

      const tickerIds = article.articleTickers.map((at) => at.tickerId);
      if (tickerIds.length === 0) return;

      // Find users who watch any of these tickers and have active alert configs
      const watchlistItems = await prisma.watchlistItem.findMany({
        where: { tickerId: { in: tickerIds } },
        include: {
          user: {
            include: {
              alertConfigs: {
                where: {
                  isActive: true,
                  OR: [
                    { tickerId: null },
                    { tickerId: { in: tickerIds } },
                  ],
                },
              },
            },
          },
        },
      });

      // Deduplicate by user (one user may watch multiple tickers in this article)
      const userMap = new Map(watchlistItems.map((w) => [w.user.id, w.user]));

      for (const user of userMap.values()) {
        // Check tier: free users get delayed news
        if (user.tier === "FREE") {
          const delayHours = 24;
          const cutoff = new Date(Date.now() - delayHours * 60 * 60 * 1000);
          if (article.publishedAt > cutoff) continue; // too recent for free user
        }

        const configs = user.alertConfigs;
        if (configs.length === 0) continue;

        // Check frequency cap: don't alert same user about same ticker within cap window
        const recentNotif = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            status: "SENT",
            createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
          },
        });
        if (recentNotif) continue;

        const shouldAlert = configs.some((cfg) => {
          if (cfg.sentimentFilter.length > 0 && !cfg.sentimentFilter.includes(article.summary!.sentiment)) return false;
          if (cfg.impactTags.length > 0 && article.impactTag && !cfg.impactTags.includes(article.impactTag)) return false;
          if (cfg.keywords.length > 0) {
            const text = (article.title + " " + article.summary!.summary).toLowerCase();
            if (!cfg.keywords.some((kw) => text.includes(kw.toLowerCase()))) return false;
          }
          return true;
        });

        if (!shouldAlert) continue;

        const notif = await prisma.notification.create({
          data: {
            userId: user.id,
            articleId: article.id,
            channel: "EMAIL",
            status: "PENDING",
          },
        });

        try {
          if (user.emailDigestEnabled && configs.some((c) => c.channels.includes("EMAIL"))) {
            await sendAlertEmail({
              to: user.email,
              name: user.name ?? undefined,
              article: {
                title: article.title,
                url: article.url,
                sourceName: article.sourceName,
                summary: article.summary.summary,
                sentiment: article.summary.sentiment,
                tickers: article.articleTickers.map((at) => at.ticker.symbol),
              },
            });
          }

          await prisma.notification.update({
            where: { id: notif.id },
            data: { status: "SENT", sentAt: new Date() },
          });

          log.info({ userId: user.id, articleId }, "Alert sent");
        } catch (err) {
          await prisma.notification.update({
            where: { id: notif.id },
            data: { status: "FAILED", error: (err as Error).message },
          });
          log.error({ userId: user.id, articleId, err }, "Alert failed");
        }
      }
    },
    { connection: getConnection(), concurrency: 5 },
  );

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Alert job failed");
  });
}
