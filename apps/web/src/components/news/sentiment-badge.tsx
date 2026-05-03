import { cn, sentimentBg } from "@/lib/utils";

export function SentimentBadge({ sentiment, className }: { sentiment: string; className?: string }) {
  const emoji = { BULLISH: "🟢", BEARISH: "🔴", NEUTRAL: "⚪" }[sentiment] ?? "⚪";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", sentimentBg(sentiment), className)}>
      {emoji} {sentiment}
    </span>
  );
}
