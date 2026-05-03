import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

const SP500_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", sector: "Technology", industry: "Consumer Electronics", exchange: "NASDAQ", aliases: ["Apple", "Apple Inc."] },
  { symbol: "MSFT", name: "Microsoft Corporation", sector: "Technology", industry: "Software", exchange: "NASDAQ", aliases: ["Microsoft", "Microsoft Corp"] },
  { symbol: "NVDA", name: "NVIDIA Corporation", sector: "Technology", industry: "Semiconductors", exchange: "NASDAQ", aliases: ["Nvidia", "NVIDIA"] },
  { symbol: "AMZN", name: "Amazon.com Inc.", sector: "Consumer Cyclical", industry: "Internet Retail", exchange: "NASDAQ", aliases: ["Amazon", "Amazon.com"] },
  { symbol: "META", name: "Meta Platforms Inc.", sector: "Technology", industry: "Social Media", exchange: "NASDAQ", aliases: ["Meta", "Facebook", "Meta Platforms"] },
  { symbol: "GOOGL", name: "Alphabet Inc.", sector: "Technology", industry: "Search Engines", exchange: "NASDAQ", aliases: ["Alphabet", "Google", "Alphabet Inc."] },
  { symbol: "GOOG", name: "Alphabet Inc. Class C", sector: "Technology", industry: "Search Engines", exchange: "NASDAQ", aliases: ["Google Class C"] },
  { symbol: "TSLA", name: "Tesla Inc.", sector: "Consumer Cyclical", industry: "Auto Manufacturers", exchange: "NASDAQ", aliases: ["Tesla", "Tesla Inc."] },
  { symbol: "BRK.B", name: "Berkshire Hathaway B", sector: "Financial Services", industry: "Insurance", exchange: "NYSE", aliases: ["Berkshire", "Berkshire Hathaway"] },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", sector: "Financial Services", industry: "Banks", exchange: "NYSE", aliases: ["JPMorgan", "JP Morgan", "Chase"] },
  { symbol: "JNJ", name: "Johnson & Johnson", sector: "Healthcare", industry: "Drug Manufacturers", exchange: "NYSE", aliases: ["Johnson and Johnson", "J&J"] },
  { symbol: "V", name: "Visa Inc.", sector: "Financial Services", industry: "Credit Services", exchange: "NYSE", aliases: ["Visa"] },
  { symbol: "MA", name: "Mastercard Incorporated", sector: "Financial Services", industry: "Credit Services", exchange: "NYSE", aliases: ["Mastercard", "Mastercard Inc."] },
  { symbol: "XOM", name: "Exxon Mobil Corporation", sector: "Energy", industry: "Oil & Gas", exchange: "NYSE", aliases: ["Exxon", "ExxonMobil"] },
  { symbol: "PG", name: "Procter & Gamble Co.", sector: "Consumer Defensive", industry: "Household Products", exchange: "NYSE", aliases: ["Procter and Gamble", "P&G"] },
  { symbol: "HD", name: "Home Depot Inc.", sector: "Consumer Cyclical", industry: "Home Improvement", exchange: "NYSE", aliases: ["Home Depot"] },
  { symbol: "UNH", name: "UnitedHealth Group Inc.", sector: "Healthcare", industry: "Healthcare Plans", exchange: "NYSE", aliases: ["UnitedHealth", "UnitedHealthcare"] },
  { symbol: "BAC", name: "Bank of America Corp.", sector: "Financial Services", industry: "Banks", exchange: "NYSE", aliases: ["Bank of America", "BofA"] },
  { symbol: "WMT", name: "Walmart Inc.", sector: "Consumer Defensive", industry: "Discount Stores", exchange: "NYSE", aliases: ["Walmart", "Wal-Mart"] },
  { symbol: "LLY", name: "Eli Lilly and Company", sector: "Healthcare", industry: "Drug Manufacturers", exchange: "NYSE", aliases: ["Eli Lilly", "Lilly"] },
  { symbol: "AVGO", name: "Broadcom Inc.", sector: "Technology", industry: "Semiconductors", exchange: "NASDAQ", aliases: ["Broadcom"] },
  { symbol: "WFC", name: "Wells Fargo & Company", sector: "Financial Services", industry: "Banks", exchange: "NYSE", aliases: ["Wells Fargo"] },
  { symbol: "COST", name: "Costco Wholesale Corporation", sector: "Consumer Defensive", industry: "Discount Stores", exchange: "NASDAQ", aliases: ["Costco", "Costco Wholesale"] },
  { symbol: "MRK", name: "Merck & Co. Inc.", sector: "Healthcare", industry: "Drug Manufacturers", exchange: "NYSE", aliases: ["Merck"] },
  { symbol: "ORCL", name: "Oracle Corporation", sector: "Technology", industry: "Software", exchange: "NYSE", aliases: ["Oracle"] },
  { symbol: "CVX", name: "Chevron Corporation", sector: "Energy", industry: "Oil & Gas", exchange: "NYSE", aliases: ["Chevron"] },
  { symbol: "ABBV", name: "AbbVie Inc.", sector: "Healthcare", industry: "Drug Manufacturers", exchange: "NYSE", aliases: ["AbbVie"] },
  { symbol: "KO", name: "Coca-Cola Company", sector: "Consumer Defensive", industry: "Beverages", exchange: "NYSE", aliases: ["Coca-Cola", "Coke"] },
  { symbol: "NFLX", name: "Netflix Inc.", sector: "Communication Services", industry: "Entertainment", exchange: "NASDAQ", aliases: ["Netflix"] },
  { symbol: "AMD", name: "Advanced Micro Devices Inc.", sector: "Technology", industry: "Semiconductors", exchange: "NASDAQ", aliases: ["AMD", "Advanced Micro Devices"] },
  { symbol: "INTC", name: "Intel Corporation", sector: "Technology", industry: "Semiconductors", exchange: "NASDAQ", aliases: ["Intel", "Intel Corporation"] },
  { symbol: "CRM", name: "Salesforce Inc.", sector: "Technology", industry: "Software", exchange: "NYSE", aliases: ["Salesforce"] },
  { symbol: "ADBE", name: "Adobe Inc.", sector: "Technology", industry: "Software", exchange: "NASDAQ", aliases: ["Adobe"] },
  { symbol: "PFE", name: "Pfizer Inc.", sector: "Healthcare", industry: "Drug Manufacturers", exchange: "NYSE", aliases: ["Pfizer"] },
  { symbol: "PYPL", name: "PayPal Holdings Inc.", sector: "Financial Services", industry: "Credit Services", exchange: "NASDAQ", aliases: ["PayPal"] },
  { symbol: "UBER", name: "Uber Technologies Inc.", sector: "Technology", industry: "Ride Sharing", exchange: "NYSE", aliases: ["Uber"] },
  { symbol: "SHOP", name: "Shopify Inc.", sector: "Technology", industry: "E-Commerce", exchange: "NYSE", aliases: ["Shopify"] },
  { symbol: "SQ", name: "Block Inc.", sector: "Technology", industry: "Fintech", exchange: "NYSE", aliases: ["Block", "Square"] },
  { symbol: "COIN", name: "Coinbase Global Inc.", sector: "Financial Services", industry: "Crypto Exchange", exchange: "NASDAQ", aliases: ["Coinbase"] },
  { symbol: "PLTR", name: "Palantir Technologies Inc.", sector: "Technology", industry: "Software", exchange: "NYSE", aliases: ["Palantir"] },
  { symbol: "SNOW", name: "Snowflake Inc.", sector: "Technology", industry: "Cloud Computing", exchange: "NYSE", aliases: ["Snowflake"] },
  { symbol: "ABNB", name: "Airbnb Inc.", sector: "Consumer Cyclical", industry: "Travel", exchange: "NASDAQ", aliases: ["Airbnb"] },
  { symbol: "LYFT", name: "Lyft Inc.", sector: "Technology", industry: "Ride Sharing", exchange: "NASDAQ", aliases: ["Lyft"] },
  { symbol: "RIVN", name: "Rivian Automotive Inc.", sector: "Consumer Cyclical", industry: "Auto Manufacturers", exchange: "NASDAQ", aliases: ["Rivian"] },
  { symbol: "RBLX", name: "Roblox Corporation", sector: "Technology", industry: "Gaming", exchange: "NYSE", aliases: ["Roblox"] },
  { symbol: "SPOT", name: "Spotify Technology SA", sector: "Communication Services", industry: "Entertainment", exchange: "NYSE", aliases: ["Spotify"] },
  { symbol: "SNAP", name: "Snap Inc.", sector: "Technology", industry: "Social Media", exchange: "NYSE", aliases: ["Snap", "Snapchat"] },
  { symbol: "PINS", name: "Pinterest Inc.", sector: "Technology", industry: "Social Media", exchange: "NYSE", aliases: ["Pinterest"] },
  { symbol: "HOOD", name: "Robinhood Markets Inc.", sector: "Financial Services", industry: "Fintech", exchange: "NASDAQ", aliases: ["Robinhood"] },
  { symbol: "DIS", name: "Walt Disney Company", sector: "Communication Services", industry: "Entertainment", exchange: "NYSE", aliases: ["Disney", "Walt Disney"] },
];

const CRYPTO_TICKERS = [
  { symbol: "BTC", name: "Bitcoin", sector: "Layer 1", aliases: ["Bitcoin", "bitcoin", "btc"] },
  { symbol: "ETH", name: "Ethereum", sector: "Layer 1", aliases: ["Ethereum", "ethereum", "ether"] },
  { symbol: "BNB", name: "BNB", sector: "Exchange Token", aliases: ["Binance Coin", "BNB Chain"] },
  { symbol: "SOL", name: "Solana", sector: "Layer 1", aliases: ["Solana", "solana"] },
  { symbol: "XRP", name: "XRP", sector: "Payments", aliases: ["Ripple", "XRP", "xrp"] },
  { symbol: "USDC", name: "USD Coin", sector: "Stablecoin", aliases: ["USD Coin", "USDC"] },
  { symbol: "ADA", name: "Cardano", sector: "Layer 1", aliases: ["Cardano", "cardano"] },
  { symbol: "AVAX", name: "Avalanche", sector: "Layer 1", aliases: ["Avalanche", "avalanche"] },
  { symbol: "DOGE", name: "Dogecoin", sector: "Meme Coin", aliases: ["Dogecoin", "dogecoin", "doge"] },
  { symbol: "DOT", name: "Polkadot", sector: "Layer 0", aliases: ["Polkadot", "polkadot"] },
  { symbol: "MATIC", name: "Polygon", sector: "Layer 2", aliases: ["Polygon", "polygon", "matic"] },
  { symbol: "SHIB", name: "Shiba Inu", sector: "Meme Coin", aliases: ["Shiba Inu", "shiba", "shib"] },
  { symbol: "LTC", name: "Litecoin", sector: "Payments", aliases: ["Litecoin", "litecoin"] },
  { symbol: "UNI", name: "Uniswap", sector: "DeFi", aliases: ["Uniswap", "uniswap"] },
  { symbol: "LINK", name: "Chainlink", sector: "Oracle", aliases: ["Chainlink", "chainlink"] },
  { symbol: "ATOM", name: "Cosmos", sector: "Layer 0", aliases: ["Cosmos", "cosmos", "ATOM"] },
  { symbol: "TRX", name: "TRON", sector: "Layer 1", aliases: ["TRON", "tron"] },
  { symbol: "NEAR", name: "NEAR Protocol", sector: "Layer 1", aliases: ["NEAR Protocol", "near"] },
  { symbol: "APT", name: "Aptos", sector: "Layer 1", aliases: ["Aptos", "aptos"] },
  { symbol: "ARB", name: "Arbitrum", sector: "Layer 2", aliases: ["Arbitrum", "arbitrum"] },
  { symbol: "OP", name: "Optimism", sector: "Layer 2", aliases: ["Optimism", "optimism"] },
  { symbol: "SUI", name: "Sui", sector: "Layer 1", aliases: ["Sui", "sui"] },
  { symbol: "PEPE", name: "Pepe", sector: "Meme Coin", aliases: ["Pepe", "pepe"] },
  { symbol: "WIF", name: "dogwifhat", sector: "Meme Coin", aliases: ["dogwifhat", "wif"] },
  { symbol: "INJ", name: "Injective", sector: "DeFi", aliases: ["Injective", "injective"] },
];

const SAMPLE_SOURCES = [
  { source: "yahoo_rss", sourceName: "Yahoo Finance" },
  { source: "coingecko", sourceName: "CoinGecko" },
  { source: "finnhub", sourceName: "Finnhub" },
  { source: "cryptopanic", sourceName: "CryptoPanic" },
  { source: "coindesk_rss", sourceName: "CoinDesk" },
  { source: "alpha_vantage", sourceName: "Alpha Vantage" },
];

const SAMPLE_TITLES = [
  "Q3 earnings beat expectations as revenue jumps 15% year-over-year",
  "CEO announces strategic partnership with major tech firm",
  "Analyst upgrades rating to Buy with $250 price target",
  "New product launch drives surge in pre-orders",
  "Federal Reserve decision sparks market volatility",
  "Regulatory approval granted for expanded operations",
  "Short seller report causes significant stock decline",
  "Merger talks confirmed, shares rally on acquisition premium",
  "Supply chain disruptions weigh on quarterly guidance",
  "Institutional investor discloses 5% stake",
  "Board approves $2B share buyback program",
  "Network upgrade successfully deployed, transaction fees drop 40%",
  "Major exchange lists token, trading volume surges",
  "DeFi protocol reports record total value locked",
  "Whale movement triggers speculation of price action",
  "Developer activity hits all-time high on GitHub",
  "Layer 2 solution reduces gas fees by 90%",
  "Stablecoin de-peg concerns addressed by team",
  "Crypto exchange announces expansion into new markets",
  "Spot ETF approval drives institutional inflows",
];

const SAMPLE_SUMMARIES = [
  "The company reported strong quarterly results, beating analyst expectations across all key metrics. Revenue growth was driven by increased customer adoption and expanding margins. Management raised full-year guidance citing continued demand strength.",
  "This development represents a significant strategic move that could reshape competitive dynamics in the sector. Analysts are divided on near-term implications but generally view the longer-term outlook positively. Market participants are watching closely for execution updates.",
  "The regulatory decision removes a key overhang that has weighed on sentiment for months. This opens new market opportunities and should accelerate growth initiatives. However, implementation risks remain and will require monitoring.",
  "The technical upgrade addresses longstanding scalability concerns and is expected to drive user adoption. Early metrics suggest the deployment was successful with minimal disruption. The team expects this to be a catalyst for ecosystem growth.",
];

function randomDate(daysBack = 30): Date {
  const ms = Date.now() - Math.random() * daysBack * 86400 * 1000;
  return new Date(ms);
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log("🌱 Seeding database...");

  // Upsert stock tickers
  for (const t of SP500_STOCKS) {
    await prisma.ticker.upsert({
      where: { symbol: t.symbol },
      create: {
        symbol: t.symbol,
        name: t.name,
        type: "STOCK",
        exchange: t.exchange,
        sector: t.sector,
        industry: t.industry,
        aliases: t.aliases,
        isActive: true,
        rank: SP500_STOCKS.indexOf(t) + 1,
      },
      update: { aliases: t.aliases, sector: t.sector, industry: t.industry },
    });
  }
  console.log(`✓ Seeded ${SP500_STOCKS.length} stock tickers`);

  // Upsert crypto tickers
  for (const t of CRYPTO_TICKERS) {
    await prisma.ticker.upsert({
      where: { symbol: t.symbol },
      create: {
        symbol: t.symbol,
        name: t.name,
        type: "CRYPTO",
        sector: t.sector,
        aliases: t.aliases,
        isActive: true,
        rank: CRYPTO_TICKERS.indexOf(t) + 1,
      },
      update: { aliases: t.aliases, sector: t.sector },
    });
  }
  console.log(`✓ Seeded ${CRYPTO_TICKERS.length} crypto tickers`);

  // Seed sample articles (1000+)
  const allTickers = [...SP500_STOCKS, ...CRYPTO_TICKERS];
  let articleCount = 0;

  for (let i = 0; i < 1100; i++) {
    const ticker1 = pick(allTickers);
    const ticker2 = Math.random() > 0.6 ? pick(allTickers) : null;
    const source = pick(SAMPLE_SOURCES);
    const title = `${ticker1.name}: ${pick(SAMPLE_TITLES)}`;
    const body = `${pick(SAMPLE_SUMMARIES)} ${pick(SAMPLE_SUMMARIES)}`;
    const contentHash = crypto.createHash("sha256").update(`${title}${i}`).digest("hex");
    const sentiment: "BULLISH" | "BEARISH" | "NEUTRAL" = pick(["BULLISH", "BULLISH", "BEARISH", "NEUTRAL"]);
    const impactTag = pick(["EARNINGS", "ANALYST_RATING", "GENERAL", "GENERAL", "MACRO", "SOCIAL_BUZZ"] as const);

    try {
      const tickerRecords = await prisma.ticker.findMany({
        where: { symbol: { in: [ticker1.symbol, ...(ticker2 ? [ticker2.symbol] : [])] } },
        select: { id: true },
      });

      const article = await prisma.article.create({
        data: {
          title,
          url: `https://example.com/news/${contentHash.slice(0, 8)}`,
          source: source.source,
          sourceName: source.sourceName,
          publishedAt: randomDate(30),
          body,
          contentHash,
          impactTag,
          isProcessed: true,
          articleTickers: {
            create: tickerRecords.map((t) => ({ tickerId: t.id, confidence: 1.0 })),
          },
        },
      });

      await prisma.articleSummary.create({
        data: {
          articleId: article.id,
          summary: pick(SAMPLE_SUMMARIES),
          keyPoints: ["Key development could impact sector", "Management commentary shows confidence", "Watch for follow-up announcement"],
          sentiment,
          catalysts: ["Revenue beat", "New product launch"],
          model: "claude-haiku-4-5-20251001",
          promptTokens: 450 + Math.floor(Math.random() * 200),
          completionTokens: 120 + Math.floor(Math.random() * 80),
          costUsd: 0.0004 + Math.random() * 0.0003,
        },
      });

      articleCount++;
    } catch {
      // Skip duplicates
    }
  }

  console.log(`✓ Seeded ~${articleCount} articles with summaries`);
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
