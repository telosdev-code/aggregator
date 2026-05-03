import type { TickerDetectionResult } from "@aggregator/shared";

// Words that look like tickers but are common English words — block them
const BLOCKLIST = new Set([
  "A", "I", "IT", "IS", "ON", "OR", "AT", "TO", "IN", "OF", "AS", "BE",
  "DO", "GO", "IF", "NO", "SO", "UP", "US", "WE", "BY", "AN", "AM", "PM",
  "ALL", "AND", "ARE", "BUT", "CAN", "FOR", "HAD", "HAS", "HIM", "HIS",
  "HOW", "ITS", "MAY", "NEW", "NOT", "NOW", "OLD", "ONE", "OUR", "OUT",
  "OWN", "SAY", "SHE", "THE", "TOO", "TWO", "USE", "WAS", "WHO", "WHY",
  "WILL", "WITH", "WELL", "YOUR", "JUST", "FROM", "BEEN", "HAVE", "MORE",
  "THAT", "THAN", "THEY", "THIS", "WERE", "WHAT", "WHEN", "WHICH",
  "NEWS", "POST", "NEXT", "BEST", "MOST", "LAST", "LONG", "HIGH", "BACK",
  "ALSO", "OVER", "ONLY", "INTO", "SOME", "BOTH", "VERY", "EACH", "SUCH",
  "MOVE", "FREE", "FULL", "REAL", "RATE", "RISK", "TIME", "PLAN", "TYPE",
  "VIEW", "WORK", "YEAR", "WEEK", "DAYS", "WEEK", "MAKE", "SAID", "LIKE",
  "LIFE", "JUST", "WANT", "GOOD", "HELP", "GIVE", "HERE", "AREA", "PART",
  "HOLD", "CALL", "SELL", "OPEN", "LATE", "DEAL", "BANK", "FUND", "FIRM",
  "FELL", "RISE", "FELL", "GAIN", "LOSS", "DEBT", "BOND", "CASH", "COST",
  "SELL", "SOLD", "BULL", "BEAR", "GOLD", "IRON", "COAL", "DATA", "BASE",
  "CEO", "CFO", "COO", "IPO", "ICO", "DeFi", "DEFI", "NFT", "DAO",
  "GDP", "CPI", "FED", "SEC", "IMF", "WHO", "CDC", "FDA", "IRS",
  "USA", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY",
  "LLC", "INC", "LTD", "PLC", "CORP", "GROUP",
  "REIT", "NOTE", "BOND", "SWAP", "CALL", "PUTS", "PUTS",
]);

export interface TickerDb {
  symbol: string;
  aliases: string[]; // lower-cased at build time for O(1) lookup
}

export class TickerDetector {
  // symbol → Ticker record
  private symbolMap = new Map<string, TickerDb>();
  // lower-case alias → symbol
  private aliasMap = new Map<string, string>();

  constructor(tickers: TickerDb[]) {
    this.load(tickers);
  }

  load(tickers: TickerDb[]): void {
    this.symbolMap.clear();
    this.aliasMap.clear();
    for (const t of tickers) {
      this.symbolMap.set(t.symbol.toUpperCase(), t);
      // Register the symbol itself
      this.aliasMap.set(t.symbol.toLowerCase(), t.symbol);
      for (const alias of t.aliases) {
        this.aliasMap.set(alias.toLowerCase(), t.symbol);
      }
    }
  }

  detect(text: string): TickerDetectionResult[] {
    const results = new Map<string, TickerDetectionResult>();

    // Pass 1: explicit $SYMBOL prefix — highest confidence
    for (const m of text.matchAll(/\$([A-Z]{1,6})(?:[-.]USD)?\b/gi)) {
      const raw = m[1].toUpperCase();
      if (BLOCKLIST.has(raw)) continue;
      const symbol = this.aliasMap.get(raw.toLowerCase());
      if (symbol && !results.has(symbol)) {
        results.set(symbol, { symbol, confidence: 1.0, matchedAlias: `$${raw}` });
      }
    }

    // Pass 2: bare uppercase ticker, word-boundary, not inside a longer word
    // Require length ≥ 2 to avoid single-letter false positives
    for (const m of text.matchAll(/\b([A-Z]{2,6})(?:[-.]USD)?\b/g)) {
      const raw = m[1];
      if (BLOCKLIST.has(raw)) continue;
      const symbol = this.aliasMap.get(raw.toLowerCase());
      if (symbol && !results.has(symbol)) {
        results.set(symbol, { symbol, confidence: 0.85, matchedAlias: raw });
      }
    }

    // Pass 3: company name aliases (e.g. "Apple" → AAPL)
    const lower = text.toLowerCase();
    for (const [alias, symbol] of this.aliasMap) {
      // Only apply multi-word or longer aliases here to avoid noise
      if (alias.length < 5 || alias === symbol.toLowerCase()) continue;
      if (results.has(symbol)) continue;

      // Whole-word match for aliases
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(lower)) {
        results.set(symbol, { symbol, confidence: 0.7, matchedAlias: alias });
      }
    }

    return Array.from(results.values());
  }
}
