import test from "node:test";
import assert from "node:assert/strict";
import { parseLaunch, parseMigration, makeFilter } from "../lib/feed.js";

const VALID_MINT = "So11111111111111111111111111111111111111112";
const VALID_DEV = "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin";

test("parseLaunch parses a valid create message and trims name and symbol", () => {
  const launch = parseLaunch({
    txType: "create",
    mint: VALID_MINT,
    name: "  Cool\tToken\n ",
    symbol: "  COOL ",
    traderPublicKey: VALID_DEV,
    solAmount: "2.5",
    initialBuy: "1000",
    marketCapSol: "30.2",
    uri: "https://example.com/meta.json",
    signature: "sig123",
  });

  assert.ok(launch);
  assert.equal(launch.type, "launch");
  assert.equal(launch.mint, VALID_MINT);
  assert.equal(launch.name, "Cool Token");
  assert.equal(launch.symbol, "COOL");
  assert.equal(launch.dev, VALID_DEV);
  assert.equal(launch.devBuySol, 2.5);
  assert.equal(launch.devBuyTokens, 1000);
  assert.equal(launch.marketCapSol, 30.2);
  assert.equal(launch.uri, "https://example.com/meta.json");
  assert.equal(launch.signature, "sig123");
});

test("parseLaunch turns non-numeric or missing numeric fields into 0", () => {
  const launch = parseLaunch({
    txType: "create",
    mint: VALID_MINT,
    name: "Alpha",
    symbol: "ALP",
    solAmount: "abc",
  });

  assert.ok(launch);
  assert.equal(launch.devBuySol, 0);
  assert.equal(launch.devBuyTokens, 0);
  assert.equal(launch.marketCapSol, 0);
  assert.equal(launch.dev, null);
});

test("parseLaunch returns null for non-create messages or missing/invalid mint", () => {
  assert.equal(parseLaunch({ txType: "trade", mint: VALID_MINT }), null);
  assert.equal(parseLaunch({ txType: "migrate", mint: VALID_MINT }), null);
  assert.equal(parseLaunch({ txType: "create" }), null);
  assert.equal(parseLaunch({ txType: "create", mint: "not-an-address" }), null);
  assert.equal(parseLaunch(null), null);
});

test("parseMigration parses a valid migrate message and ignores others", () => {
  const mig = parseMigration({
    txType: "migrate",
    mint: VALID_MINT,
    pool: "raydium",
    signature: "mig-sig",
  });

  assert.ok(mig);
  assert.equal(mig.type, "migration");
  assert.equal(mig.mint, VALID_MINT);
  assert.equal(mig.pool, "raydium");
  assert.equal(mig.signature, "mig-sig");

  assert.equal(parseMigration({ txType: "create", mint: VALID_MINT }), null);
  assert.equal(parseMigration({ txType: "trade", mint: VALID_MINT }), null);
  assert.equal(parseMigration({ txType: "migrate" }), null);
});

test("makeFilter enforces minDevBuy and maxDevBuy bounds", () => {
  const minOnly = makeFilter({ minDevBuy: 1 });
  assert.equal(minOnly({ name: "Coin", symbol: "CN", devBuySol: 0.99 }), false);
  assert.equal(minOnly({ name: "Coin", symbol: "CN", devBuySol: 1.0 }), true);

  const bounded = makeFilter({ minDevBuy: 1, maxDevBuy: 5 });
  assert.equal(bounded({ name: "Coin", symbol: "CN", devBuySol: 5 }), true);
  assert.equal(bounded({ name: "Coin", symbol: "CN", devBuySol: 5.01 }), false);
});

test("makeFilter matches name case-insensitively on ticker and gives exclude precedence", () => {
  const tickerFilter = makeFilter({ name: "ai|agent" });
  assert.equal(tickerFilter({ name: "Nebula", symbol: "AIX", devBuySol: 0 }), true);
  assert.equal(tickerFilter({ name: "Nebula", symbol: "AGENT", devBuySol: 0 }), true);
  assert.equal(tickerFilter({ name: "Nebula", symbol: "SOL", devBuySol: 0 }), false);

  const combined = makeFilter({ name: "ai|agent", exclude: "scam|rug" });
  assert.equal(combined({ name: "AI Scam", symbol: "AISCAM", devBuySol: 2 }), false);
  assert.equal(combined({ name: "Clean Agent", symbol: "AGT", devBuySol: 2 }), true);
});
