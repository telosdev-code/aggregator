import { TickerDetector } from "../ticker-detector.js";
import assert from "node:assert/strict";
import { describe, it, before } from "node:test";

const TICKERS = [
  { symbol: "AAPL", aliases: ["apple", "apple inc.", "apple inc"] },
  { symbol: "MSFT", aliases: ["microsoft", "microsoft corporation", "microsoft corp"] },
  { symbol: "NVDA", aliases: ["nvidia", "nvidia corporation"] },
  { symbol: "BTC", aliases: ["bitcoin", "btc"] },
  { symbol: "ETH", aliases: ["ethereum", "ether"] },
  { symbol: "TSLA", aliases: ["tesla", "tesla inc.", "tesla motors"] },
  { symbol: "ON", aliases: ["on semiconductor", "onsemi"] }, // classic false positive
];

let detector: TickerDetector;

before(() => {
  detector = new TickerDetector(TICKERS);
});

describe("TickerDetector", () => {
  it("detects explicit $SYMBOL prefix with confidence 1.0", () => {
    const results = detector.detect("$AAPL stock rallied today");
    const aapl = results.find((r) => r.symbol === "AAPL");
    assert.ok(aapl, "should detect AAPL");
    assert.equal(aapl?.confidence, 1.0);
    assert.equal(aapl?.matchedAlias, "$AAPL");
  });

  it("detects bare uppercase ticker", () => {
    const results = detector.detect("MSFT reported strong earnings");
    const msft = results.find((r) => r.symbol === "MSFT");
    assert.ok(msft, "should detect MSFT");
    assert.ok(msft!.confidence < 1.0, "bare ticker should have lower confidence");
  });

  it("detects company name alias", () => {
    const results = detector.detect("Apple Inc. announced a new product today");
    const aapl = results.find((r) => r.symbol === "AAPL");
    assert.ok(aapl, "should detect AAPL via alias");
    assert.ok(aapl!.confidence <= 0.7);
  });

  it("detects multiple tickers in one text", () => {
    const results = detector.detect("$AAPL and $MSFT both gained, while TSLA fell");
    const symbols = results.map((r) => r.symbol);
    assert.ok(symbols.includes("AAPL"), "should detect AAPL");
    assert.ok(symbols.includes("MSFT"), "should detect MSFT");
    assert.ok(symbols.includes("TSLA"), "should detect TSLA");
  });

  it("does NOT produce duplicate entries for same ticker", () => {
    const results = detector.detect("$AAPL Apple AAPL apple inc.");
    const aaplResults = results.filter((r) => r.symbol === "AAPL");
    assert.equal(aaplResults.length, 1, "should deduplicate AAPL");
  });

  it("does NOT flag 'ON' as ON Semiconductor without context", () => {
    const results = detector.detect("This depends on market conditions");
    const on = results.find((r) => r.symbol === "ON");
    assert.equal(on, undefined, "should not match 'on' as ON ticker");
  });

  it("DOES detect ON Semiconductor via alias", () => {
    const results = detector.detect("ON Semiconductor announced a new chip");
    const on = results.find((r) => r.symbol === "ON");
    assert.ok(on, "should detect ON via 'on semiconductor' alias");
  });

  it("detects BTC via Bitcoin alias", () => {
    const results = detector.detect("Bitcoin surged past $70,000 today");
    const btc = results.find((r) => r.symbol === "BTC");
    assert.ok(btc, "should detect BTC via Bitcoin alias");
  });

  it("detects ETH via Ethereum alias", () => {
    const results = detector.detect("Ethereum network upgrade completed successfully");
    const eth = results.find((r) => r.symbol === "ETH");
    assert.ok(eth, "should detect ETH via Ethereum alias");
  });

  it("does not detect blocklisted words as tickers", () => {
    const results = detector.detect("ALL trades ARE based ON news");
    const symbols = results.map((r) => r.symbol);
    assert.ok(!symbols.includes("ALL"), "should not match ALL");
    assert.ok(!symbols.includes("ARE"), "should not match ARE");
  });

  it("returns empty array for text with no tickers", () => {
    const results = detector.detect("The weather is nice today");
    assert.equal(results.length, 0);
  });

  it("handles $BTC-USD format", () => {
    const results = detector.detect("$BTC-USD is at all time highs");
    const btc = results.find((r) => r.symbol === "BTC");
    assert.ok(btc, "should detect BTC from $BTC-USD");
  });
});
