import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function sentimentColor(sentiment: string): string {
  return { BULLISH: "text-green-600", BEARISH: "text-red-600", NEUTRAL: "text-gray-500" }[sentiment] ?? "text-gray-500";
}

export function sentimentBg(sentiment: string): string {
  return { BULLISH: "bg-green-50 text-green-700 ring-green-600/20", BEARISH: "bg-red-50 text-red-700 ring-red-600/20", NEUTRAL: "bg-gray-50 text-gray-600 ring-gray-500/20" }[sentiment] ?? "bg-gray-50";
}

export function impactTagColor(tag: string): string {
  const map: Record<string, string> = {
    BREAKING: "bg-red-100 text-red-800",
    EARNINGS: "bg-purple-100 text-purple-800",
    ANALYST_RATING: "bg-blue-100 text-blue-800",
    REGULATORY: "bg-orange-100 text-orange-800",
    MACRO: "bg-yellow-100 text-yellow-800",
    SOCIAL_BUZZ: "bg-pink-100 text-pink-800",
    GENERAL: "bg-gray-100 text-gray-700",
  };
  return map[tag] ?? "bg-gray-100 text-gray-700";
}
