import { Worker } from "bullmq";
import pino from "pino";
import { prisma } from "@aggregator/db";
import { QUEUES, hashContent } from "@aggregator/shared";
import type { NormalizedArticle } from "@aggregator/shared";
import {
  YahooRssScraper,
  CoinGeckoScraper,
  FinnhubScraper,
  AlphaVantageScraper,
  CryptoPanicScraper,
  CoinDeskRssScraper,
} from "@aggregator/scrapers";
import { TickerDetector } from "@aggregator/scrapers";
import { summarizeQueue } from "../lib/queue.js";
import { getConnection } from "../lib/queue.js";

const log = pino({ level: process.env.LOG_LEVEL ?? "info" });

const SCRAPERS = [
  new YahooRssScraper(),
  new CoinGeckoScraper(),
  new FinnhubScraper(),
  new AlphaVantageScraper(),
  new CryptoPanicScraper(),
  new CoinDeskRssScraper(),
];

let detector: TickerDetector | null = null;

async function getDetector(): Promise<TickerDetector> {
  if (detector) return detector;
  const tickers = await prisma.ticker.findMany({
    where: { isActive: true },
    select: { symbol: true, aliases: true },
  });
  detector = new TickerDetector(tickers);
  // Refresh every 6 hours
  setInterval(async () => {
    const fresh = await prisma.ticker.findMany({
      where: { isActive: true },
      select: { symbol: true, aliases: true },
    });
    detector?.load(fresh);
  }, 6 * 60 * 60 * 1000);
  return detector;
}

export function startScrapeWorker(): void {
  const worker = new Worker(
    QUEUES.SCRAPE,
    async (job) => {
      const source: string = job.data.source ?? "all";
      log.info({ source }, "Scrape job started");

      const scrapers =
        source === "all"
          ? SCRAPERS
          : SCRAPERS.filter((s) => s.source === source);

      const det = await getDetector();
      let totalNew = 0;

      for (const scraper of scrapers) {
        const runRecord = await prisma.scraperRun.create({
          data: { source: scraper.source },
        });
        const start = Date.now();

        try {
          const articles = await scraper.fetch();
          log.info({ source: scraper.source, count: articles.length }, "Fetched articles");

          const newCount = await ingestArticles(articles, det);
          totalNew += newCount;

          await prisma.scraperRun.update({
            where: { id: runRecord.id },
            data: {
              completedAt: new Date(),
              articlesFound: articles.length,
              articlesNew: newCount,
              durationMs: Date.now() - start,
            },
          });
        } catch (err) {
          log.error({ source: scraper.source, err }, "Scraper failed");
          await prisma.scraperRun.update({
            where: { id: runRecord.id },
            data: { error: (err as Error).message, completedAt: new Date() },
          });
        }
      }

      log.info({ totalNew }, "Scrape job complete");
      return { totalNew };
    },
    { connection: getConnection(), concurrency: 1 },
  );

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Scrape job failed");
  });
}

async function ingestArticles(
  articles: NormalizedArticle[],
  det: TickerDetector,
): Promise<number> {
  let newCount = 0;

  for (const article of articles) {
    try {
      const existing = await prisma.article.findUnique({
        where: { contentHash: article.contentHash },
        select: { id: true },
      });
      if (existing) continue;

      // Run ticker detection on title + body
      const text = [article.title, article.body].filter(Boolean).join(" ");
      const detections = det.detect(text);

      // Also resolve raw tickers mentioned by the scraper
      const rawSymbols = article.tickersMentioned.map((s) => s.toUpperCase());
      const rawTickers = await prisma.ticker.findMany({
        where: { symbol: { in: rawSymbols }, isActive: true },
        select: { id: true, symbol: true },
      });

      const tickerMap = new Map(rawTickers.map((t) => [t.symbol, t.id]));
      for (const det_ of detections) {
        if (!tickerMap.has(det_.symbol)) {
          const t = await prisma.ticker.findUnique({
            where: { symbol: det_.symbol },
            select: { id: true },
          });
          if (t) tickerMap.set(det_.symbol, t.id);
        }
      }

      const created = await prisma.article.create({
        data: {
          title: article.title,
          url: article.url,
          source: article.source,
          sourceName: article.sourceName,
          publishedAt: article.publishedAt,
          body: article.body,
          imageUrl: article.imageUrl,
          author: article.author,
          contentHash: article.contentHash,
          sentimentScore: article.sentimentScore,
          articleTickers: {
            create: Array.from(tickerMap.entries()).map(([symbol, tickerId]) => {
              const det_ = detections.find((d) => d.symbol === symbol);
              return {
                tickerId,
                confidence: det_?.confidence ?? 1.0,
              };
            }),
          },
        },
      });

      // Queue for AI summarization
      await summarizeQueue.add(
        "summarize",
        { articleId: created.id },
        {
          jobId: `summarize:${created.id}`,
          attempts: 3,
          backoff: { type: "exponential", delay: 5000 },
        },
      );

      newCount++;
    } catch (err) {
      log.error({ url: article.url, err }, "Failed to ingest article");
    }
  }

  return newCount;
}
