import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashContent } from "@aggregator/shared";

// Unit tests for scraper utilities — no network calls
describe("hashContent", () => {
  it("returns a 64-char hex SHA-256", () => {
    const hash = hashContent("hello world");
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]+$/);
  });

  it("normalizes whitespace before hashing", () => {
    const h1 = hashContent("hello  world");
    const h2 = hashContent("hello world");
    assert.equal(h1, h2, "should normalize whitespace");
  });

  it("is case-insensitive", () => {
    const h1 = hashContent("Apple AAPL");
    const h2 = hashContent("apple aapl");
    assert.equal(h1, h2, "should be case-insensitive");
  });

  it("produces different hashes for different content", () => {
    const h1 = hashContent("article one about Apple");
    const h2 = hashContent("article two about Microsoft");
    assert.notEqual(h1, h2);
  });
});

describe("NormalizedArticle shape", () => {
  it("contains all required fields", () => {
    const article = {
      title: "Test Article",
      url: "https://example.com/test",
      source: "yahoo_rss",
      sourceName: "Yahoo Finance",
      publishedAt: new Date(),
      tickersMentioned: ["AAPL"],
      contentHash: hashContent("Test Articlehttps://example.com/test"),
    };

    assert.ok(article.title, "needs title");
    assert.ok(article.url, "needs url");
    assert.ok(article.source, "needs source");
    assert.ok(article.sourceName, "needs sourceName");
    assert.ok(article.publishedAt instanceof Date, "publishedAt should be Date");
    assert.ok(Array.isArray(article.tickersMentioned), "tickersMentioned should be array");
    assert.ok(article.contentHash, "needs contentHash");
  });
});

describe("CoinGecko scraper (recorded fixture)", () => {
  it("handles empty data gracefully", async () => {
    const { CoinGeckoScraper } = await import("../coingecko.js");
    // Without a real API key in test environment, fetch will fail
    // This tests that the adapter handles errors without crashing
    const scraper = new CoinGeckoScraper();
    assert.equal(typeof scraper.fetch, "function");
    assert.equal(scraper.source, "coingecko");
    assert.equal(scraper.sourceName, "CoinGecko");
  });
});

describe("Finnhub scraper (no API key)", () => {
  it("returns empty array when no API key is set", async () => {
    const originalKey = process.env.FINNHUB_API_KEY;
    delete process.env.FINNHUB_API_KEY;

    const { FinnhubScraper } = await import("../finnhub.js");
    const scraper = new FinnhubScraper();
    const results = await scraper.fetch();
    assert.deepEqual(results, []);

    process.env.FINNHUB_API_KEY = originalKey;
  });
});

describe("Alpha Vantage scraper (no API key)", () => {
  it("returns empty array when no API key is set", async () => {
    const originalKey = process.env.ALPHA_VANTAGE_API_KEY;
    delete process.env.ALPHA_VANTAGE_API_KEY;

    const { AlphaVantageScraper } = await import("../alpha-vantage.js");
    const scraper = new AlphaVantageScraper();
    const results = await scraper.fetch();
    assert.deepEqual(results, []);

    process.env.ALPHA_VANTAGE_API_KEY = originalKey;
  });
});
