import { cn, impactTagColor } from "@/lib/utils";

const LABELS: Record<string, string> = {
  BREAKING: "Breaking",
  EARNINGS: "Earnings",
  ANALYST_RATING: "Analyst",
  REGULATORY: "Regulatory",
  MACRO: "Macro",
  SOCIAL_BUZZ: "Social",
  GENERAL: "General",
};

export function ImpactTagBadge({ tag, className }: { tag: string; className?: string }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", impactTagColor(tag), className)}>
      {LABELS[tag] ?? tag}
    </span>
  );
}
