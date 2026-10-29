import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createFundingPulseApp } from "../src/agent.js";
import {
  x402StubMiddleware,
  resolvePayments,
} from "../src/payments.js";
import { Hono } from "hono";
import type { PaymentsConfig } from "@lucid-dreams/agent-kit";

describe("x402 middleware", () => {
  it("stub unpaid → HTTP 402 with clear body", async () => {
    const app = new Hono();
    app.use(
      "/entrypoints/funding-pulse/invoke",
      x402StubMiddleware({
        payTo: "0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429",
        network: "base-sepolia",
        price: "0.01",
      }),
    );
    app.post("/entrypoints/funding-pulse/invoke", (c) => c.json({ ok: true }));

    const unpaid = await app.request("/entrypoints/funding-pulse/invoke", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: { markets: ["BTC"] } }),
    });
    assert.equal(unpaid.status, 402);
    const body = (await unpaid.json()) as {
      error: string;
      x402Version: number;
      accepts: unknown[];
      stub?: boolean;
    };
    assert.equal(body.error, "Payment Required");
    assert.equal(body.x402Version, 1);
    assert.ok(Array.isArray(body.accepts) && body.accepts.length >= 1);
    assert.equal(body.stub, true);
  });

  it("stub bypass header allows handler", async () => {
    const app = new Hono();
    app.use(
      "/entrypoints/funding-pulse/invoke",
      x402StubMiddleware({
        payTo: "0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429",
        network: "base-sepolia",
        price: "0.01",
      }),
    );
    app.post("/entrypoints/funding-pulse/invoke", (c) => c.json({ ok: true }));

    const paid = await app.request("/entrypoints/funding-pulse/invoke", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-PAYMENT-BYPASS": "1",
      },
      body: JSON.stringify({ input: {} }),
    });
    assert.equal(paid.status, 200);
    assert.deepEqual(await paid.json(), { ok: true });
  });

  it("createFundingPulseApp with payments returns 402 on unpaid invoke", async () => {
    const payments: PaymentsConfig = {
      payTo: "0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429",
      facilitatorUrl: "https://facilitator.daydreams.systems" as PaymentsConfig["facilitatorUrl"],
      network: "base-sepolia" as PaymentsConfig["network"],
      defaultPrice: "0.01",
    };
    const { app } = createFundingPulseApp({ payments });
    const res = await app.request("/entrypoints/funding-pulse/invoke", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        input: { venue_ids: ["hyperliquid"], markets: ["BTC"] },
      }),
    });
    assert.equal(res.status, 402, await res.clone().text());
    const body = (await res.json()) as {
      error?: string;
      accepts?: unknown[];
      x402Version?: number;
    };
    assert.ok(body.x402Version === 1 || body.error || body.accepts);
    assert.ok(
      body.accepts !== undefined ||
        (typeof body.error === "string" && body.error.length > 0),
    );
  });

  it("resolvePayments is false without ADDRESS", () => {
    const prevA = process.env.ADDRESS;
    const prevP = process.env.PAY_TO;
    const prevE = process.env.X402_ENABLED;
    delete process.env.ADDRESS;
    delete process.env.PAY_TO;
    delete process.env.X402_ENABLED;
    try {
      assert.equal(resolvePayments(), false);
    } finally {
      if (prevA !== undefined) process.env.ADDRESS = prevA;
      else delete process.env.ADDRESS;
      if (prevP !== undefined) process.env.PAY_TO = prevP;
      else delete process.env.PAY_TO;
      if (prevE !== undefined) process.env.X402_ENABLED = prevE;
      else delete process.env.X402_ENABLED;
    }
  });
});
