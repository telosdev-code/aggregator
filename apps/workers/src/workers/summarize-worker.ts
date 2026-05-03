import { Worker } from "bullmq";
import pino from "pino";
import { prisma } from "@aggregator/db";
import { QUEUES } from "@aggregator/shared";
import { summarizeArticle } from "@aggregator/ai";
import { getConnection, alertQueue } from "../lib/queue.js";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

export function startSummarizeWorker(): void {
  const worker = new Worker(
    QUEUES.SUMMARIZE,
    async (job) => {
      const { articleId } = job.data as { articleId: string };

      const article = await prisma.article.findUnique({
        where: { id: articleId },
        include: { summary: true },
      });

      if (!article) {
        log.warn({ articleId }, "Article not found, skipping summarization");
        return;
      }

      // Idempotent: skip if already summarized
      if (article.summary) return;

      const result = await summarizeArticle({
        title: article.title,
        body: article.body ?? undefined,
        source: article.sourceName,
        publishedAt: article.publishedAt,
        isHeadline: article.impactTag === "BREAKING",
      });

      await prisma.$transaction([
        prisma.articleSummary.create({
          data: {
            articleId,
            summary: result.summary,
            keyPoints: result.keyPoints,
            sentiment: result.sentiment,
            catalysts: result.catalysts,
            model: result.model,
            promptTokens: result.promptTokens,
            completionTokens: result.completionTokens,
            costUsd: result.costUsd,
          },
        }),
        prisma.article.update({
          where: { id: articleId },
          data: {
            isProcessed: true,
            impactTag: result.impactTag,
            sentimentScore:
              result.sentiment === "BULLISH"
                ? 0.7
                : result.sentiment === "BEARISH"
                  ? -0.7
                  : 0,
          },
        }),
      ]);

      log.info({ articleId, model: result.model, cost: result.costUsd.toFixed(6) }, "Summarized");

      // Trigger alert evaluation for this article
      await alertQueue.add(
        "evaluate-alerts",
        { articleId },
        { jobId: `alert:${articleId}`, attempts: 2 },
      );
    },
    { connection: getConnection(), concurrency: 3 },
  );

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Summarize job failed");
  });
}
