export type VenueId = "hyperliquid" | "binance" | "dydx";

export type FundingPulseRow = {
  venue_id: VenueId | string;
  market: string;
  /** Current funding rate as a decimal (e.g. 0.0001 = 0.01% per period) */
  funding_rate: number | null;
  /** Seconds until next funding payment when known */
  time_to_next: number | null;
  /** Absolute next funding time (ISO 8601) when known */
  next_funding_time?: string | null;
  /** Open interest in venue base units (coins / contracts) */
  open_interest: number | null;
  /**
   * Long/short skew.
   * - Binance: global long/short account ratio (longs/shorts).
   * - Hyperliquid: mark premium vs oracle (mark/oracle - 1); positive ≈ longs richer.
   */
  skew: number | null;
  mark_price?: number | null;
  as_of: string;
  source?: string;
  error?: string;
};

export type PulseSummary = {
  /** 0–100 heat score: 50 ≈ flat funding; higher = longs paying / long heat */
  pulse_score: number;
  pulse_label: "cold" | "cool" | "neutral" | "warm" | "hot";
  avg_funding_rate: number | null;
  venues_ok: number;
  venues_failed: number;
};

export type FundingPulseResult = {
  results: FundingPulseRow[];
  venues_queried: string[];
  markets_queried: string[];
  pulse: PulseSummary;
  as_of: string;
};

export type FetchFn = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;
