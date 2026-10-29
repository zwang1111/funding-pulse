import type { PaymentsConfig } from "@lucid-dreams/agent-kit";
import { paymentsFromEnv } from "@lucid-dreams/agent-kit";

/**
 * Resolve x402 payments for createAgentApp.
 * - Enabled when ADDRESS or PAY_TO is set and X402_ENABLED !== "0".
 * - Local free/bypass: omit ADDRESS, or set X402_ENABLED=0.
 */
export function resolvePayments(): PaymentsConfig | false {
  if (process.env.X402_ENABLED === "0") return false;
  const payTo = process.env.ADDRESS || process.env.PAY_TO;
  if (!payTo) return false;
  return paymentsFromEnv({
    defaultPrice: process.env.DEFAULT_PRICE ?? "0.01",
  });
}

export function paymentsEnabled(): boolean {
  return resolvePayments() !== false;
}

type StubNext = () => Promise<void | Response>;
type StubContext = {
  req: {
    header: (name: string) => string | undefined;
    url: string;
  };
  json: (body: unknown, status?: number) => Response;
};

/**
 * Deterministic local 402 without facilitator settle (for smoke tests).
 * Enable with X402_STUB=1 alongside ADDRESS. Bypass with header
 * X-PAYMENT-BYPASS: 1.
 */
export function x402StubMiddleware(cfg: {
  payTo: string;
  network: string;
  price: string;
  resourceHint?: string;
}) {
  return async (c: StubContext, next: StubNext) => {
    if (
      c.req.header("X-PAYMENT-BYPASS") === "1" ||
      c.req.header("x-payment-bypass") === "1"
    ) {
      return next();
    }
    if (c.req.header("X-PAYMENT") || c.req.header("x-payment")) {
      return next();
    }

    const url = new URL(c.req.url);
    return c.json(
      {
        error: "Payment Required",
        message: "X-PAYMENT header is required",
        x402Version: 1,
        accepts: [
          {
            scheme: "exact",
            network: cfg.network,
            maxAmountRequired: cfg.price,
            resource: cfg.resourceHint ?? `${url.origin}${url.pathname}`,
            description: "perps-funding-pulse invoke",
            mimeType: "application/json",
            payTo: cfg.payTo,
            maxTimeoutSeconds: 300,
          },
        ],
        stub: true,
      },
      402,
    );
  };
}

export function shouldUseX402Stub(): boolean {
  return process.env.X402_STUB === "1" && paymentsEnabled();
}
