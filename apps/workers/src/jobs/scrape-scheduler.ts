import { scrapeQueue } from "../lib/queue.js";

export async function scheduleScrapeJobs(): Promise<void> {
  // Remove old repeatable jobs first (idempotent restart)
  const existing = await scrapeQueue.getRepeatableJobs();
  for (const job of existing) {
    await scrapeQueue.removeRepeatableByKey(job.key);
  }

  // Run all scrapers every 10 minutes
  await scrapeQueue.add(
    "scrape-all",
    { source: "all" },
    {
      repeat: { every: 10 * 60 * 1000 },
      jobId: "scrape-all",
      attempts: 3,
      backoff: { type: "exponential", delay: 30_000 },
    },
  );

  console.log("[scheduler] Scrape job scheduled every 10 minutes");
}
