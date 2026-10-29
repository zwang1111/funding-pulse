# Deploy — public HTTPS + x402

Goal: stable public URL where unpaid `POST /entrypoints/funding-pulse/invoke` returns **HTTP 402**.

## Prerequisites

- Docker (or a Node 20+ host)
- EVM **pay-to** address for x402 (`ADDRESS`) — Base mainnet or `base-sepolia` for test
- Do **not** invent a Solana payout address here; that goes only in the bounty PR when the user claims

## Option A — Fly.io (recommended)

```bash
cd /workspace/web3-earn/daydreamsai-funding-pulse
# edit fly.toml `app = "..."` to a unique name
fly auth login
fly apps create <unique-app-name>
fly secrets set ADDRESS=0xYourEvmPayTo NETWORK=base DEFAULT_PRICE=0.01 \
  FACILITATOR_URL=https://facilitator.daydreams.systems
fly deploy
```

Public URL: `https://<unique-app-name>.fly.dev`

## Option B — Railway

```bash
railway login && railway init && railway up
railway variables set ADDRESS=0xYourEvmPayTo NETWORK=base DEFAULT_PRICE=0.01 PORT=8787
# Attach public HTTPS domain in dashboard
```

## Option C — Render

- New → Blueprint → `render.yaml`, or Web Service from Dockerfile
- Set secret `ADDRESS` in dashboard → Deploy

## Option D — local Docker smoke

```bash
docker build -t perps-funding-pulse .
docker run --rm -p 8787:8787 \
  -e ADDRESS=0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429 \
  -e NETWORK=base-sepolia \
  -e DEFAULT_PRICE=0.01 \
  perps-funding-pulse
```

## Verify x402 on the public host

```bash
BASE=https://<your-host>

curl -s "$BASE/health"
curl -s "$BASE/v1/x402-status"
curl -s "$BASE/.well-known/agent.json" | head

# Must be HTTP 402 with accepts[] / X-PAYMENT required
curl -si -X POST "$BASE/entrypoints/funding-pulse/invoke" \
  -H 'content-type: application/json' \
  -d '{"input":{"venue_ids":["hyperliquid"],"markets":["BTC"]}}' | head -40

# Free probes (no paywall)
curl -s "$BASE/v1/funding?venues=hyperliquid&markets=BTC" | head
```

## Local free / bypass (dev only)

| Mode | How |
|---|---|
| Free invoke | unset `ADDRESS` / `PAY_TO`, or `X402_ENABLED=0` |
| Real unpaid → 402 | `ADDRESS=0x…` `NETWORK=base-sepolia` `DEFAULT_PRICE=0.01` |
| Stub 402 | also `X402_STUB=1`; bypass with `X-PAYMENT-BYPASS: 1` |

```bash
ADDRESS=0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429 \
NETWORK=base-sepolia DEFAULT_PRICE=0.01 \
npm start
```

## After deploy (user / zwang1111)

1. Push this folder to a **zwang1111** GitHub repo (do not invent remotes).
2. Fill `submissions/funding-pulse.md` TODOs (public URL + Solana receive).
3. Open PR into `daydreamsai/agent-bounties` linking **#8** — user claims; bots do not.
