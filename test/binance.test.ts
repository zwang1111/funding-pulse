import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchBinanceFunding } from "../src/venues/binance.js";

describe("binance", () => {
  it("fetchBinanceFunding aggregates premiumIndex + OI + skew from mock fetch", async () => {
    const fetchMock: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("premiumIndex")) {
        return new Response(
          JSON.stringify({
            symbol: "BTCUSDT",
            lastFundingRate: "0.0001",
            nextFundingTime: Date.UTC(2026, 9, 29, 16, 0, 0),
            markPrice: "80000",
            time: Date.UTC(2026, 9, 29, 14, 0, 0),
          }),
          { status: 200 },
        );
      }
      if (url.includes("openInterest")) {
        return new Response(
          JSON.stringify({ symbol: "BTCUSDT", openInterest: "1234.5", time: 1 }),
          { status: 200 },
        );
      }
      if (url.includes("globalLongShortAccountRatio")) {
        return new Response(
          JSON.stringify([
            {
              symbol: "BTCUSDT",
              longShortRatio: "1.5",
              longAccount: "0.6",
              shortAccount: "0.4",
              timestamp: 1,
            },
          ]),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    };

    const now = new Date(Date.UTC(2026, 9, 29, 14, 0, 0));
    const rows = await fetchBinanceFunding(["BTC"], {
      fetch: fetchMock,
      now: () => now,
      baseUrl: "https://fapi.binance.com",
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].market, "BTCUSDT");
    assert.equal(rows[0].funding_rate, 0.0001);
    assert.equal(rows[0].open_interest, 1234.5);
    assert.equal(rows[0].skew, 1.5);
    assert.equal(rows[0].time_to_next, 7200);
    assert.equal(rows[0].next_funding_time, "2026-10-29T16:00:00.000Z");
    assert.equal(rows[0].error, undefined);
  });
});
