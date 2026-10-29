import { computePulse } from "../pulse.js";
import type { FetchFn, FundingPulseResult, VenueId } from "../types.js";
import { fetchBinanceFunding } from "./binance.js";
import { fetchHyperliquidFunding } from "./hyperliquid.js";

const DEFAULT_VENUES: VenueId[] = ["hyperliquid", "binance"];

export type CollectDeps = {
  fetch?: FetchFn;
  now?: () => Date;
};

export async function collectFundingPulse(
  input: {
    venue_ids?: string[];
    markets?: string[];
  },
  deps: CollectDeps = {},
): Promise<FundingPulseResult> {
  const venues = (input.venue_ids?.length ? input.venue_ids : DEFAULT_VENUES).map(
    (v) => v.toLowerCase(),
  );
  const markets = (input.markets?.length ? input.markets : ["BTC", "ETH"]).map(
    (m) => m.toUpperCase(),
  );
  const now = deps.now?.() ?? new Date();

  const chunks = await Promise.all(
    venues.map(async (venue) => {
      if (venue === "hyperliquid") {
        return fetchHyperliquidFunding(markets, deps);
      }
      if (venue === "binance") {
        return fetchBinanceFunding(markets, deps);
      }
      return markets.map((market) => ({
        venue_id: venue,
        market,
        funding_rate: null,
        time_to_next: null,
        open_interest: null,
        skew: null,
        as_of: now.toISOString(),
        error: `Unknown venue_id: ${venue}`,
      }));
    }),
  );

  const results = chunks.flat();
  return {
    results,
    venues_queried: venues,
    markets_queried: markets,
    pulse: computePulse(results),
    as_of: now.toISOString(),
  };
}

export { fetchBinanceFunding, fetchHyperliquidFunding };
