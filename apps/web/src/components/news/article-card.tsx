import Image from "next/image";
import Link from "next/link";
import { cn, formatRelativeTime, sentimentBg, impactTagColor } from "@/lib/utils";

interface ArticleCardProps {
  article: {
    id: string;
    title: string;
    url: string;
    sourceName: string;
    publishedAt: string;
    imageUrl?: string;
    impactTag?: string;
    summary: { summary: string; sentiment: string } | null;
    tickers: string[];
  };
  className?: string;
}

export function ArticleCard({ article, className }: ArticleCardProps) {
  return (
    <article className={cn("flex flex-col rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden", className)}>
      {article.imageUrl && (
        <div className="relative h-40 w-full overflow-hidden bg-gray-100">
          <Image src={article.imageUrl} alt="" fill className="object-cover" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
          <span>{article.sourceName}</span>
          <span>•</span>
          <time>{formatRelativeTime(article.publishedAt)}</time>
          {article.impactTag && (
            <span className={cn("rounded px-1.5 py-0.5 font-medium", impactTagColor(article.impactTag))}>
              {article.impactTag.replace("_", " ")}
            </span>
          )}
        </div>
        <h3 className="flex-1 text-sm font-semibold leading-snug text-gray-900 line-clamp-2">
          <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
            {article.title}
          </a>
        </h3>
        {article.summary && (
          <div className="mt-2">
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", sentimentBg(article.summary.sentiment))}>
              {article.summary.sentiment}
            </span>
            <p className="mt-1.5 text-xs text-gray-500 line-clamp-2 leading-relaxed">
              {article.summary.summary}
            </p>
          </div>
        )}
        {article.tickers.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {article.tickers.slice(0, 4).map((t) => (
              <Link
                key={t}
                href={`/ticker/${t}`}
                className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-mono font-medium text-gray-700 hover:bg-blue-100 hover:text-blue-700"
              >
                ${t}
              </Link>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
