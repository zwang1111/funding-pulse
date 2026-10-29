import app from "./agent.js";
import { paymentsEnabled, shouldUseX402Stub } from "./payments.js";

const port = Number(process.env.PORT ?? 8787);

async function main() {
  const { serve } = await import("@hono/node-server");
  serve({ fetch: app.fetch, port });
  const pay = paymentsEnabled();
  console.log(`perps-funding-pulse listening on http://127.0.0.1:${port}`);
  console.log(`  GET  /health`);
  console.log(`  GET  /.well-known/agent.json`);
  console.log(`  GET  /v1/funding?venues=hyperliquid,binance&markets=BTC,ETH`);
  console.log(`  GET  /v1/x402-status`);
  console.log(`  POST /entrypoints/funding-pulse/invoke`);
  console.log(
    `  x402: ${pay ? "ON (unpaid invoke → 402)" : "OFF (free invoke; set ADDRESS to enable)"}` +
      (shouldUseX402Stub() ? " [STUB]" : ""),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export default app;
