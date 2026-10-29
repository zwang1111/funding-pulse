import type { FundingPulseRow, PulseSummary } from "./types.js";

function mean(nums: number[]): number | null {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function labelFor(score: number): PulseSummary["pulse_label"] {
  if (score < 30) return "cold";
  if (score < 45) return "cool";
  if (score < 55) return "neutral";
  if (score < 70) return "warm";
  return "hot";
}

/**
 * Simple composite pulse from venue funding rows.
 * Maps average funding rate into 0–100 around a neutral 50.
 * Typical hourly rates ~1e-5 → small shift; 1e-4 → strong heat.
 */
export function computePulse(rows: FundingPulseRow[]): PulseSummary {
  const withRate = rows.filter((r) => r.funding_rate != null);
  const failed = rows.filter((r) => r.funding_rate == null);
  const avg = mean(withRate.map((r) => r.funding_rate as number));

  let pulse_score = 50;
  if (avg != null) {
    // Scale: 0.0001 funding → +50 points (clamped)
    pulse_score = Math.round(
      Math.min(100, Math.max(0, 50 + avg * 500_000)),
    );
  }

  return {
    pulse_score,
    pulse_label: labelFor(pulse_score),
    avg_funding_rate: avg,
    venues_ok: withRate.length,
    venues_failed: failed.length,
  };
}
