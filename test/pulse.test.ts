import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { computePulse } from "../src/pulse.js";
import { collectFundingPulse } from "../src/venues/index.js";
import type { FundingPulseRow } from "../src/types.js";

describe("pulse + collect", () => {
  it("computePulse maps flat funding near 50", () => {
    const rows: FundingPulseRow[] = [
      {
        venue_id: "hyperliquid",
        market: "BTC",
        funding_rate: 0,
        time_to_next: 1,
        open_interest: 1,
        skew: 0,
        as_of: new Date().toISOString(),
      },
    ];
    const p = computePulse(rows);
    assert.equal(p.pulse_score, 50);
    assert.equal(p.pulse_label, "neutral");
  });

  it("computePulse rises with positive funding", () => {
    const rows: FundingPulseRow[] = [
      {
        venue_id: "binance",
        market: "BTCUSDT",
        funding_rate: 0.0001,
        time_to_next: 1,
        open_interest: 1,
        skew: 1,
        as_of: new Date().toISOString(),
      },
    ];
    const p = computePulse(rows);
    assert.equal(p.pulse_score, 100);
    assert.equal(p.pulse_label, "hot");
  });

  it("collectFundingPulse with mocks returns pulse", async () => {
    const hlPayload = [
      { universe: [{ name: "BTC" }] },
      [
        {
          funding: "0.00002",
          openInterest: "10",
          markPx: "1",
          oraclePx: "1",
          premium: "0",
        },
      ],
    ];
    const fetchMock: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.includes("hyperliquid") || (init?.method === "POST" && url.includes("info"))) {
        return new Response(JSON.stringify(hlPayload), { status: 200 });
      }
      if (url.includes("premiumIndex")) {
        return new Response(
          JSON.stringify({
            lastFundingRate: "0.00002",
            nextFundingTime: Date.UTC(2026, 9, 29, 16, 0, 0),
            markPrice: "1",
          }),
          { status: 200 },
        );
      }
      if (url.includes("openInterest")) {
        return new Response(JSON.stringify({ openInterest: "5" }), { status: 200 });
      }
      if (url.includes("globalLongShortAccountRatio")) {
        return new Response(
          JSON.stringify([{ longShortRatio: "1.1" }]),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 200 });
    };

    const out = await collectFundingPulse(
      { venue_ids: ["hyperliquid", "binance"], markets: ["BTC"] },
      {
        fetch: fetchMock,
        now: () => new Date(Date.UTC(2026, 9, 29, 14, 0, 0)),
      },
    );
    assert.equal(out.results.length, 2);
    assert.ok(out.pulse.pulse_score >= 50);
    assert.equal(out.pulse.venues_ok, 2);
    assert.ok(out.as_of);
  });
});
