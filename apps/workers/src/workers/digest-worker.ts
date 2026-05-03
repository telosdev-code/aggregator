import { Worker } from "bullmq";
import pino from "pino";
import { prisma } from "@aggregator/db";
import { QUEUES } from "@aggregator/shared";
import { getConnection } from "../lib/queue.js";
import { sendDigestEmail } from "../lib/email.js";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

export function startDigestWorker(): void {
  const worker = new Worker(
    QUEUES.EMAIL_DIGEST,
    async (job) => {
      const { type } = job.data as { type: "daily_morning" | "daily_evening" };
      log.info({ type }, "Digest job started");

      // Determine lookback window
      const windowHours = 12;
      const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);

      // Get all users with email digests enabled (excluding free-tier for now: they get daily only)
      const users = await prisma.user.findMany({
        where: { emailDigestEnabled: true },
        include: {
          watchlistItems: {
            include: { ticker: { select: { id: true, symbol: true, name: true } } },
          },
        },
      });

      log.info({ count: users.length }, "Processing digest for users");

      for (const user of users) {
        try {
          const tickerIds = user.watchlistItems.map((w) => w.ticker.id);
          if (tickerIds.length === 0) continue;

          const articles = await prisma.article.findMany({
            where: {
              isVisible: true,
              publishedAt: { gte: since },
              articleTickers: { some: { tickerId: { in: tickerIds } } },
              summary: { isNot: null },
            },
            include: {
              summary: { select: { summary: true, sentiment: true, keyPoints: true } },
              articleTickers: {
                include: { ticker: { select: { symbol: true } } },
              },
            },
            orderBy: { publishedAt: "desc" },
            take: 15,
          });

          if (articles.length === 0) continue;

          // Check we haven't already sent a digest of this type today
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const alreadySent = await prisma.digestLog.findFirst({
            where: { userId: user.id, type, sentAt: { gte: today } },
          });
          if (alreadySent) continue;

          await sendDigestEmail({
            to: user.email,
            name: user.name ?? undefined,
            type,
            articles: articles.map((a) => ({
              title: a.title,
              url: a.url,
              sourceName: a.sourceName,
              publishedAt: a.publishedAt,
              summary: a.summary!.summary,
              sentiment: a.summary!.sentiment,
              tickers: a.articleTickers.map((at) => at.ticker.symbol),
            })),
          });

          await prisma.digestLog.create({
            data: {
              userId: user.id,
              type,
              articleIds: articles.map((a) => a.id),
            },
          });

          log.info({ userId: user.id, articleCount: articles.length }, "Digest sent");
        } catch (err) {
          log.error({ userId: user.id, err }, "Digest failed for user");
        }
      }
    },
    { connection: getConnection(), concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Digest job failed");
  });
}
