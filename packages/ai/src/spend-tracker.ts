import { prisma } from "@aggregator/db";

const DAILY_LIMIT_USD = parseFloat(
  process.env.CLAUDE_DAILY_SPEND_LIMIT_USD ?? "10.00",
);

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function checkDailySpendLimit(): Promise<void> {
  const date = todayKey();
  const row = await prisma.aiSpendLog.findFirst({
    where: { date },
    select: { totalCostUsd: true },
  });
  const spent = row?.totalCostUsd ?? 0;
  if (spent >= DAILY_LIMIT_USD) {
    throw new Error(
      `Daily Claude spend limit reached: $${spent.toFixed(4)} / $${DAILY_LIMIT_USD}`,
    );
  }
}

export async function recordSpend(
  model: string,
  totalTokens: number,
  costUsd: number,
): Promise<void> {
  const date = todayKey();
  await prisma.aiSpendLog.upsert({
    where: { date_model: { date, model } },
    create: {
      date,
      model,
      totalCostUsd: costUsd,
      totalTokens,
      articleCount: 1,
    },
    update: {
      totalCostUsd: { increment: costUsd },
      totalTokens: { increment: totalTokens },
      articleCount: { increment: 1 },
    },
  });
}

export async function getDailySpend(date?: string): Promise<number> {
  const d = date ?? todayKey();
  const rows = await prisma.aiSpendLog.findMany({ where: { date: d } });
  return rows.reduce((sum, r) => sum + r.totalCostUsd, 0);
}
