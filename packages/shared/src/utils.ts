import crypto from "crypto";

export function hashContent(content: string): string {
  return crypto
    .createHash("sha256")
    .update(normalizeContent(content))
    .digest("hex");
}

export function normalizeContent(content: string): string {
  return content
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .trim();
}

// Exponential backoff with jitter for API retries
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 4,
  baseDelayMs = 1000,
): Promise<T> {
  let lastError: Error;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (attempt < maxAttempts - 1) {
        const jitter = Math.random() * 0.3 + 0.85; // 0.85–1.15
        const delay = baseDelayMs * Math.pow(2, attempt) * jitter;
        await sleep(delay);
      }
    }
  }
  throw lastError!;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Calculate Claude API cost in USD
export function calcClaudeCost(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  // Pricing per 1M tokens (as of mid-2025)
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-haiku-4-5-20251001": { input: 0.8, output: 4.0 },
    "claude-sonnet-4-6": { input: 3.0, output: 15.0 },
    "claude-opus-4-7": { input: 15.0, output: 75.0 },
  };
  const rates = pricing[model] ?? { input: 3.0, output: 15.0 };
  return (
    (promptTokens / 1_000_000) * rates.input +
    (completionTokens / 1_000_000) * rates.output
  );
}

export function formatCurrency(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(usd);
}

// Truncate body for prompt construction — stay within token budget
export function truncateBody(body: string, maxChars = 4000): string {
  if (body.length <= maxChars) return body;
  return body.slice(0, maxChars) + "…";
}
