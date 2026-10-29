/**
 * Binance USDT-M futures public REST.
 * - GET /fapi/v1/premiumIndex  → lastFundingRate, nextFundingTime, markPrice
 * - GET /fapi/v1/openInterest  → openInterest
 * - GET /futures/data/globalLongShortAccountRatio → longShortRatio (skew)
 */
import type { FetchFn, FundingPulseRow } from "../types.js";

export const BINANCE_FAPI = "https://fapi.binance.com";

export type BinanceDeps = {
  fetch?: FetchFn;
  now?: () => Date;
  baseUrl?: string;
};

function toSymbol(market: string): string {
  const m = market.toUpperCase().replace(/-?PERP$/i, "");
  if (m.endsWith("USDT") || m.endsWith("USDC")) return m;
  return `${m}USDT`;
}

function parseNum(v: string | number | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

async function getJson(
  fetchFn: FetchFn,
  url: string,
): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const res = await fetchFn(url, { method: "GET" });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} for ${url}` };
    return { ok: true, data: await res.json() };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function fetchOneBinanceMarket(
  market: string,
  deps: BinanceDeps = {},
): Promise<FundingPulseRow> {
  const fetchFn = deps.fetch ?? globalThis.fetch;
  const now = deps.now?.() ?? new Date();
  const base = (deps.baseUrl ?? BINANCE_FAPI).replace(/\/$/, "");
  const symbol = toSymbol(market);
  const as_of = now.toISOString();
  const source = base;

  const premiumUrl = `${base}/fapi/v1/premiumIndex?symbol=${symbol}`;
  const oiUrl = `${base}/fapi/v1/openInterest?symbol=${symbol}`;
  const skewUrl = `${base}/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=1`;

  const [premiumRes, oiRes, skewRes] = await Promise.all([
    getJson(fetchFn, premiumUrl),
    getJson(fetchFn, oiUrl),
    getJson(fetchFn, skewUrl),
  ]);

  if (!premiumRes.ok) {
    return {
      venue_id: "binance",
      market: symbol,
      funding_rate: null,
      time_to_next: null,
      open_interest: null,
      skew: null,
      as_of,
      source,
      error: premiumRes.error,
    };
  }

  const premium = premiumRes.data as {
    lastFundingRate?: string;
    nextFundingTime?: number;
    markPrice?: string;
    time?: number;
  };

  const funding_rate = parseNum(premium.lastFundingRate);
  const mark_price = parseNum(premium.markPrice);
  let time_to_next: number | null = null;
  let next_funding_time: string | null = null;
  if (typeof premium.nextFundingTime === "number") {
    next_funding_time = new Date(premium.nextFundingTime).toISOString();
    time_to_next = Math.max(
      0,
      Math.floor((premium.nextFundingTime - now.getTime()) / 1000),
    );
  }

  let open_interest: number | null = null;
  if (oiRes.ok) {
    const oi = oiRes.data as { openInterest?: string };
    open_interest = parseNum(oi.openInterest);
  }

  let skew: number | null = null;
  if (skewRes.ok && Array.isArray(skewRes.data) && skewRes.data.length > 0) {
    const row = skewRes.data[0] as { longShortRatio?: string };
    skew = parseNum(row.longShortRatio);
  }

  // OI / skew are best-effort; do not fail the row when premiumIndex succeeded.
  return {
    venue_id: "binance",
    market: symbol,
    funding_rate,
    time_to_next,
    next_funding_time,
    open_interest,
    skew,
    mark_price,
    as_of,
    source,
  };
}

export async function fetchBinanceFunding(
  markets: string[],
  deps: BinanceDeps = {},
): Promise<FundingPulseRow[]> {
  return Promise.all(markets.map((m) => fetchOneBinanceMarket(m, deps)));
}
