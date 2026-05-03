import { Queue, QueueEvents } from "bullmq";
import Redis from "ioredis";
import { QUEUES } from "@aggregator/shared";

let connection: Redis | null = null;

export function getConnection(): Redis {
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null, // required by BullMQ
    });
  }
  return connection;
}

export const scrapeQueue = new Queue(QUEUES.SCRAPE, { connection: getConnection() });
export const summarizeQueue = new Queue(QUEUES.SUMMARIZE, { connection: getConnection() });
export const alertQueue = new Queue(QUEUES.ALERT, { connection: getConnection() });
export const digestQueue = new Queue(QUEUES.EMAIL_DIGEST, { connection: getConnection() });

export const scrapeQueueEvents = new QueueEvents(QUEUES.SCRAPE, { connection: getConnection() });
