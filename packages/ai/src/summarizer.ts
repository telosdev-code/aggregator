import Anthropic from "@anthropic-ai/sdk";
import { calcClaudeCost, truncateBody } from "@aggregator/shared";
import type { SummaryResult, ImpactTag, Sentiment } from "@aggregator/shared";
import { checkDailySpendLimit, recordSpend } from "./spend-tracker.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Use Haiku for most articles, Sonnet for articles tagged as BREAKING
const MODEL_HAIKU = "claude-haiku-4-5-20251001";
const MODEL_SONNET = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are a financial news analyst. Analyze articles and return structured JSON.
Never provide investment advice. Always be factual and concise.
Respond ONLY with valid JSON matching the schema exactly.`;

const IMPACT_TAGS: ImpactTag[] = [
  "BREAKING",
  "EARNINGS",
  "ANALYST_RATING",
  "REGULATORY",
  "MACRO",
  "SOCIAL_BUZZ",
  "GENERAL",
];

const SENTIMENTS: Sentiment[] = ["BULLISH", "BEARISH", "NEUTRAL"];

interface SummarizeInput {
  title: string;
  body?: string;
  source: string;
  publishedAt: Date;
  isHeadline?: boolean; // triggers Sonnet instead of Haiku
}

export async function summarizeArticle(
  input: SummarizeInput,
): Promise<SummaryResult> {
  await checkDailySpendLimit();

  const model = input.isHeadline ? MODEL_SONNET : MODEL_HAIKU;
  const content = [input.title, input.body ? truncateBody(input.body) : ""]
    .filter(Boolean)
    .join("\n\n");

  const userPrompt = `Analyze this financial news article and return JSON:

Title: ${input.title}
Source: ${input.source}
Published: ${input.publishedAt.toISOString()}
Content: ${content}

Return this exact JSON structure:
{
  "summary": "<2-3 sentence summary of the article>",
  "keyPoints": ["<point 1>", "<point 2>", "<point 3>"],
  "sentiment": "<BULLISH|BEARISH|NEUTRAL>",
  "catalysts": ["<key price-relevant fact 1>", "<key price-relevant fact 2>"],
  "impactTag": "<BREAKING|EARNINGS|ANALYST_RATING|REGULATORY|MACRO|SOCIAL_BUZZ|GENERAL>"
}`;

  const response = await client.messages.create({
    model,
    max_tokens: 512,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawText =
    response.content[0].type === "text" ? response.content[0].text : "";

  const parsed = parseJsonResponse(rawText);

  const promptTokens = response.usage.input_tokens;
  const completionTokens = response.usage.output_tokens;
  const costUsd = calcClaudeCost(model, promptTokens, completionTokens);

  await recordSpend(model, promptTokens + completionTokens, costUsd);

  return {
    summary: parsed.summary ?? "Summary unavailable.",
    keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
    sentiment: SENTIMENTS.includes(parsed.sentiment)
      ? (parsed.sentiment as Sentiment)
      : "NEUTRAL",
    catalysts: Array.isArray(parsed.catalysts) ? parsed.catalysts : [],
    impactTag: IMPACT_TAGS.includes(parsed.impactTag)
      ? (parsed.impactTag as ImpactTag)
      : "GENERAL",
    model,
    promptTokens,
    completionTokens,
    costUsd,
  };
}

function parseJsonResponse(text: string): Record<string, unknown> {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();
  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    return {};
  }
}
