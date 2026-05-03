import type { NormalizedArticle } from "@aggregator/shared";

export interface ScraperAdapter {
  readonly source: string;
  readonly sourceName: string;
  fetch(): Promise<NormalizedArticle[]>;
}
