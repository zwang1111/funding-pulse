import { z } from "zod";
import { createAgentApp } from "@lucid-dreams/agent-kit";
import type { PaymentsConfig } from "@lucid-dreams/agent-kit";
import { collectFundingPulse } from "./venues/index.js";
import {
  resolvePayments,
  shouldUseX402Stub,
  x402StubMiddleware,
} from "./payments.js";

export type CreateFundingPulseOptions = {
  /** Override payments; false disables paywall. Default: resolve from env. */
  payments?: PaymentsConfig | false;
};

function isPaymentsConfig(
  value: PaymentsConfig | false | undefined,
): value is PaymentsConfig {
  return Boolean(value) && typeof value === "object";
}

/**
 * daydreamsai/agent-bounties#8 — Perps Funding Pulse
 * HTTP surface from agent-kit; x402 wraps invoke when payments are configured.
 */
export function createFundingPulseApp(opts: CreateFundingPulseOptions = {}) {
  const payments =
    opts.payments !== undefined ? opts.payments : resolvePayments();

  const { app, addEntrypoint, payments: activePayments } = createAgentApp(
    {
      name: "perps-funding-pulse",
      version: "0.2.0",
      description:
        "Fetch current funding rate, time-to-next, open interest, skew, and a pulse score for perps markets",
    },
    isPaymentsConfig(payments) ? { payments } : { payments: false },
  );

  const inputSchema = z.object({
    venue_ids: z.array(z.string()).optional(),
    markets: z.array(z.string()).optional(),
  });

  const outputSchema = z.object({
    results: z.array(z.record(z.string(), z.unknown())),
    venues_queried: z.array(z.string()),
    markets_queried: z.array(z.string()),
    pulse: z.object({
      pulse_score: z.number(),
      pulse_label: z.string(),
      avg_funding_rate: z.number().nullable(),
      venues_ok: z.number(),
      venues_failed: z.number(),
    }),
    as_of: z.string(),
  });

  const entryPrice = isPaymentsConfig(payments)
    ? (payments.defaultPrice ?? "0.01")
    : "0.01";

  addEntrypoint({
    key: "funding-pulse",
    description:
      "Return near-live funding metrics + pulse score for requested perps venues/markets",
    input: inputSchema,
    output: outputSchema,
    // Explicit price so withPayments always attaches when payments are on.
    price: entryPrice,
    async handler({ input }) {
      const parsed = inputSchema.parse(input ?? {});
      const output = await collectFundingPulse(parsed);
      return {
        output,
        usage: {
          total_tokens: output.results.length,
        },
      };
    },
  });

  // Local stub: deterministic 402 on invoke when X402_STUB=1.
  // Real deploy should omit X402_STUB and rely on x402-hono via agent-kit.
  if (shouldUseX402Stub() && isPaymentsConfig(payments)) {
    const stub = x402StubMiddleware({
      payTo: String(payments.payTo),
      network: String(payments.network),
      price: payments.defaultPrice ?? "0.01",
    });
    // Hono path typing differs across versions; cast keeps deploy builds clean.
    app.use("/entrypoints/funding-pulse/invoke", stub as never);
  }

  /** Convenience free GET for local smoke tests (not paywalled). */
  app.get("/v1/funding", async (c) => {
    const venues = c.req.query("venues");
    const markets = c.req.query("markets");
    const output = await collectFundingPulse({
      venue_ids: venues
        ? venues.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
      markets: markets
        ? markets.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
    });
    return c.json(output);
  });

  app.get("/v1/pulse", async (c) => {
    const output = await collectFundingPulse({
      venue_ids: ["hyperliquid", "binance"],
      markets: ["BTC", "ETH"],
    });
    return c.json({
      pulse: output.pulse,
      as_of: output.as_of,
      sample: output.results,
    });
  });

  app.get("/v1/x402-status", (c) => {
    return c.json({
      payments_enabled: Boolean(activePayments),
      stub: shouldUseX402Stub(),
      payTo: activePayments?.payTo ?? null,
      network: activePayments?.network ?? null,
      defaultPrice: activePayments?.defaultPrice ?? null,
      facilitatorUrl: activePayments?.facilitatorUrl ?? null,
      protected: ["/entrypoints/funding-pulse/invoke"],
      free: [
        "/health",
        "/entrypoints",
        "/.well-known/agent.json",
        "/v1/funding",
        "/v1/pulse",
      ],
      bypass:
        "Local free: unset ADDRESS or X402_ENABLED=0. Stub bypass: header X-PAYMENT-BYPASS: 1 when X402_STUB=1.",
    });
  });

  return { app, addEntrypoint, payments: activePayments };
}

const { app, addEntrypoint } = createFundingPulseApp();
export default app;
export { app, addEntrypoint };
