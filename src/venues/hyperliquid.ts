/**
 * Hyperliquid public info API.
 * POST https://api.hyperliquid.xyz/info { type: "metaAndAssetCtxs" }
 * Funding accrues hourly on Hyperliquid.
 */
import type { FetchFn, FundingPulseRow } from "../types.js";

export const HL_INFO_URL = "https://api.hyperliquid.xyz/info";

type UniverseItem = { name: string; szDecimals?: number; isDelisted?: boolean };
type AssetCtx = {
  funding?: string;
  openInterest?: string;
  markPx?: string;
  oraclePx?: string;
  midPx?: string | null;
  premium?: string | null;
};

export type HyperliquidDeps = {
  fetch?: FetchFn;
  now?: () => Date;
  infoUrl?: string;
};

/** Seconds until the next UTC hour (HL hourly funding). */
export function secondsUntilNextUtcHour(now: Date): number {
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours() + 1,
    0,
    0,
    0,
  );
  return Math.max(0, Math.floor((next - now.getTime()) / 1000));
}

function parseNum(v: string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function parseMetaAndAssetCtxs(
  data: unknown,
  markets: string[],
  asOf: Date,
  source: string,
): FundingPulseRow[] {
  if (!Array.isArray(data) || data.length < 2) {
    return markets.map((market) => ({
      venue_id: "hyperliquid",
      market,
      funding_rate: null,
      time_to_next: null,
      open_interest: null,
      skew: null,
      as_of: asOf.toISOString(),
      source,
      error: "Unexpected metaAndAssetCtxs shape",
    }));
  }

  const meta = data[0] as { universe?: UniverseItem[] };
  const ctxs = data[1] as AssetCtx[];
  const universe = meta?.universe ?? [];
  const byName = new Map<string, { ctx: AssetCtx; name: string }>();
  for (let i = 0; i < universe.length; i++) {
    const u = universe[i];
    if (!u?.name || u.isDelisted) continue;
    byName.set(u.name.toUpperCase(), { ctx: ctxs[i] ?? {}, name: u.name });
  }

  const time_to_next = secondsUntilNextUtcHour(asOf);
  const next = new Date(asOf.getTime() + time_to_next * 1000);

  return markets.map((raw) => {
    const key = raw.toUpperCase().replace(/-?PERP$/i, "").replace(/USDT$/i, "");
    const hit = byName.get(key);
    if (!hit) {
      return {
        venue_id: "hyperliquid",
        market: key,
        funding_rate: null,
        time_to_next: null,
        open_interest: null,
        skew: null,
        as_of: asOf.toISOString(),
        source,
        error: `Market not found on Hyperliquid: ${key}`,
      };
    }

    const funding_rate = parseNum(hit.ctx.funding);
    const open_interest = parseNum(hit.ctx.openInterest);
    const mark = parseNum(hit.ctx.markPx);
    const oracle = parseNum(hit.ctx.oraclePx);
    const premium = parseNum(hit.ctx.premium ?? undefined);
    // Prefer explicit premium; else derive mark/oracle - 1
    let skew: number | null = premium;
    if (skew == null && mark != null && oracle != null && oracle !== 0) {
      skew = mark / oracle - 1;
    }

    return {
      venue_id: "hyperliquid",
      market: hit.name,
      funding_rate,
      time_to_next,
      next_funding_time: next.toISOString(),
      open_interest,
      skew,
      mark_price: mark,
      as_of: asOf.toISOString(),
      source,
    };
  });
}

export async function fetchHyperliquidFunding(
  markets: string[],
  deps: HyperliquidDeps = {},
): Promise<FundingPulseRow[]> {
  const fetchFn = deps.fetch ?? globalThis.fetch;
  const now = deps.now?.() ?? new Date();
  const infoUrl = deps.infoUrl ?? HL_INFO_URL;
  const as_of = now.toISOString();

  try {
    const res = await fetchFn(infoUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "metaAndAssetCtxs" }),
    });
    if (!res.ok) {
      return markets.map((market) => ({
        venue_id: "hyperliquid",
        market: market.toUpperCase(),
        funding_rate: null,
        time_to_next: null,
        open_interest: null,
        skew: null,
        as_of,
        source: infoUrl,
        error: `HTTP ${res.status}`,
      }));
    }
    const data = (await res.json()) as unknown;
    return parseMetaAndAssetCtxs(data, markets, now, infoUrl);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return markets.map((market) => ({
      venue_id: "hyperliquid",
      market: market.toUpperCase(),
      funding_rate: null,
      time_to_next: null,
      open_interest: null,
      skew: null,
      as_of,
      source: infoUrl,
      error: message,
    }));
  }
}
