import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseMetaAndAssetCtxs,
  secondsUntilNextUtcHour,
  fetchHyperliquidFunding,
} from "../src/venues/hyperliquid.js";

describe("hyperliquid", () => {
  it("secondsUntilNextUtcHour at :30 is ~1800", () => {
    const now = new Date(Date.UTC(2026, 9, 29, 12, 30, 0));
    assert.equal(secondsUntilNextUtcHour(now), 1800);
  });

  it("parses metaAndAssetCtxs for BTC/ETH", () => {
    const payload = [
      {
        universe: [
          { name: "BTC", szDecimals: 5 },
          { name: "ETH", szDecimals: 4 },
          { name: "SOL", szDecimals: 2, isDelisted: true },
        ],
      },
      [
        {
          funding: "0.0000125",
          openInterest: "100.5",
          markPx: "80000",
          oraclePx: "80100",
          premium: "-0.00125",
        },
        {
          funding: "-0.00005",
          openInterest: "200",
          markPx: "2300",
          oraclePx: "2300",
          premium: "0",
        },
        {
          funding: "0",
          openInterest: "1",
          markPx: "1",
          oraclePx: "1",
          premium: "0",
        },
      ],
    ];
    const now = new Date(Date.UTC(2026, 9, 29, 12, 0, 0));
    const rows = parseMetaAndAssetCtxs(payload, ["BTC", "ETH", "MISSING"], now, "mock");
    assert.equal(rows.length, 3);
    assert.equal(rows[0].market, "BTC");
    assert.equal(rows[0].funding_rate, 0.0000125);
    assert.equal(rows[0].open_interest, 100.5);
    assert.equal(rows[0].skew, -0.00125);
    assert.equal(rows[0].time_to_next, 3600);
    assert.equal(rows[1].funding_rate, -0.00005);
    assert.ok(rows[2].error?.includes("not found"));
  });

  it("fetchHyperliquidFunding uses injected fetch", async () => {
    const payload = [
      { universe: [{ name: "BTC" }] },
      [{ funding: "0.0001", openInterest: "10", markPx: "1", oraclePx: "1", premium: "0" }],
    ];
    const fetchMock: typeof fetch = async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const rows = await fetchHyperliquidFunding(["BTC"], {
      fetch: fetchMock,
      now: () => new Date(Date.UTC(2026, 9, 29, 11, 0, 0)),
    });
    assert.equal(rows[0].funding_rate, 0.0001);
    assert.equal(rows[0].error, undefined);
  });
});
