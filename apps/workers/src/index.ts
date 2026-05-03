import { initSentry } from "./lib/sentry.js";
initSentry();
import { startScrapeWorker } from "./workers/scrape-worker.js";
import { startSummarizeWorker } from "./workers/summarize-worker.js";
import { startAlertWorker } from "./workers/alert-worker.js";
import { startDigestWorker } from "./workers/digest-worker.js";
import { scheduleScrapeJobs } from "./jobs/scrape-scheduler.js";
import { scheduleDigestJobs } from "./jobs/digest-scheduler.js";
import pino from "pino";

const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: process.env.NODE_ENV !== "production"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});

async function main() {
  log.info("Starting workers...");

  startScrapeWorker();
  startSummarizeWorker();
  startAlertWorker();
  startDigestWorker();

  await scheduleScrapeJobs();
  await scheduleDigestJobs();

  log.info("All workers running.");
}

main().catch((err) => {
  console.error("Fatal worker startup error:", err);
  process.exit(1);
});
