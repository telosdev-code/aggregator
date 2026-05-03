import { digestQueue } from "../lib/queue.js";

export async function scheduleDigestJobs(): Promise<void> {
  const existing = await digestQueue.getRepeatableJobs();
  for (const job of existing) {
    await digestQueue.removeRepeatableByKey(job.key);
  }

  // Morning digest at 7:00 AM UTC
  await digestQueue.add(
    "digest-morning",
    { type: "daily_morning" },
    {
      repeat: { pattern: "0 7 * * *", tz: "UTC" },
      jobId: "digest-morning",
      attempts: 3,
      backoff: { type: "exponential", delay: 60_000 },
    },
  );

  // Evening digest at 6:00 PM UTC
  await digestQueue.add(
    "digest-evening",
    { type: "daily_evening" },
    {
      repeat: { pattern: "0 18 * * *", tz: "UTC" },
      jobId: "digest-evening",
      attempts: 3,
      backoff: { type: "exponential", delay: 60_000 },
    },
  );

  console.log("[scheduler] Digest jobs scheduled (07:00 and 18:00 UTC)");
}
