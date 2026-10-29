# Perps Funding Pulse

**Bounty:** [daydreamsai/agent-bounties#8](https://github.com/daydreamsai/agent-bounties/issues/8) — **$1,000**  
**Status:** source on [zwang1111/funding-pulse](https://github.com/zwang1111/funding-pulse) — **not claimed, public HTTPS deploy still TODO**

## Goal

Return live (near-live) perps funding metrics for configurable venues/markets, plus a simple **pulse** score.

| Field | Meaning |
|---|---|
| `funding_rate` | Current funding rate (decimal per venue period) |
| `time_to_next` | Seconds until next funding payment |
| `open_interest` | Total open interest (venue base units) |
| `skew` | Long/short skew (see adapter notes) |
| `pulse.pulse_score` | 0–100 heat score (50 ≈ flat funding) |

**Hard requirement for payout:** deployed on a **public domain** and reachable via **x402**.

## Stack

- Node ≥ 20, TypeScript, `tsx`
- `@lucid-dreams/agent-kit` + Zod + Hono
- Venue adapters: **Hyperliquid** (public `/info`), **Binance** USDT-M futures REST

## Quick start

```bash
cd /workspace/web3-earn/daydreamsai-funding-pulse
npm install
cp .env.example .env
npm test
npm run dev
```

Smoke (free — no `ADDRESS`):

```bash
curl -s http://127.0.0.1:8787/health
curl -s 'http://127.0.0.1:8787/v1/funding?venues=hyperliquid,binance&markets=BTC,ETH' | head
curl -s -X POST http://127.0.0.1:8787/entrypoints/funding-pulse/invoke \
  -H 'content-type: application/json' \
  -d '{"input":{"venue_ids":["hyperliquid","binance"],"markets":["BTC","ETH"]}}'
curl -s http://127.0.0.1:8787/.well-known/agent.json | head
curl -s http://127.0.0.1:8787/v1/x402-status
```

## x402 (unpaid → 402)

Protected route: `POST /entrypoints/funding-pulse/invoke`  
Free: `/health`, `/entrypoints`, `/.well-known/agent.json`, `/v1/funding`, `/v1/pulse`, `/v1/x402-status`

```bash
# Real unpaid → HTTP 402 (x402-hono via agent-kit)
ADDRESS=0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429 \
NETWORK=base-sepolia DEFAULT_PRICE=0.01 \
npm start

curl -si -X POST http://127.0.0.1:8787/entrypoints/funding-pulse/invoke \
  -H 'content-type: application/json' -H 'accept: application/json' \
  -d '{"input":{"venue_ids":["hyperliquid"],"markets":["BTC"]}}' | head -40
```

| Mode | How |
|---|---|
| Free / bypass | unset `ADDRESS`, or `X402_ENABLED=0` |
| Real paywall | set `ADDRESS` (+ optional `NETWORK`, `FACILITATOR_URL`, `DEFAULT_PRICE`) |
| Stub 402 | `X402_STUB=1` + `ADDRESS`; bypass with `X-PAYMENT-BYPASS: 1` |

Paid invoke: send a valid `X-PAYMENT` header (x402 client / facilitator). See `DEPLOY.md` for public HTTPS.

## Environment variables

| Var | Required | Default | Notes |
|---|---|---|---|
| `PORT` | no | `8787` | HTTP listen port |
| `ADDRESS` / `PAY_TO` | for x402 | unset | Pay-to address; enables x402 on invoke when set |
| `NETWORK` | for x402 | kit default | e.g. `base` or `base-sepolia` |
| `FACILITATOR_URL` | for x402 | kit default | x402 facilitator |
| `DEFAULT_PRICE` | for x402 | `0.01` | Default invoke price |
| `X402_ENABLED` | no | on if `ADDRESS` set | Set `0` to force-disable paywall locally |
| `X402_STUB` | no | off | `1` = deterministic stub 402 middleware |

## HTTP surface

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | Liveness |
| `GET` | `/entrypoints` | Registered skills |
| `GET` | `/.well-known/agent.json` | Agent card / discovery |
| `POST` | `/entrypoints/funding-pulse/invoke` | Main skill (**x402** when payments configured) |
| `GET` | `/v1/funding` | Free convenience probe (`?venues=&markets=`) |
| `GET` | `/v1/pulse` | Free BTC/ETH pulse sample |
| `GET` | `/v1/x402-status` | Paywall config summary |

## Venue notes

- **Hyperliquid:** `metaAndAssetCtxs` → `funding`, `openInterest`; skew ≈ `premium` (or mark/oracle − 1); `time_to_next` = seconds to next UTC hour (hourly funding).
- **Binance:** `premiumIndex` + `openInterest` + `globalLongShortAccountRatio` (skew = long/short account ratio); `nextFundingTime` from premium index.

## Pulse score

`pulse_score = clamp(0, 100, round(50 + avg_funding_rate * 500_000))`  
Labels: cold &lt;30, cool &lt;45, neutral &lt;55, warm &lt;70, else hot.

## Deploy

See **[DEPLOY.md](./DEPLOY.md)** — Dockerfile + `fly.toml` / `railway.toml` / `render.yaml`.

Draft bounty PR body: **[submissions/funding-pulse.md](./submissions/funding-pulse.md)** (public URL + Solana still `TODO`).

## Acceptance checklist (issue #8)

- [ ] Returns `funding_rate`, `time_to_next`, `open_interest`, `skew` for requested `venue_ids` + `markets[]`
- [ ] Hyperliquid (+ Binance) live values within acceptable tolerance of venue UI
- [ ] Near real-time (HTTP fetch on each invoke; no stale multi-hour cache)
- [ ] Deployed on a **stable public domain** (not only a temporary tunnel)
- [ ] Reachable via **x402** (unpaid → HTTP 402; paid invoke succeeds)
- [ ] `GET /.well-known/agent.json` (or agent-card) discoverable
- [ ] PR into `daydreamsai/agent-bounties` under `submissions/` linking **#8**
- [ ] Submission includes **Solana wallet** for payout (user-provided; never invent)

## Submission rules (do not invent assignment)

1. Build → deploy (domain + x402) → add `submissions/<name>.md` → **open PR linking #8**.
2. **First complete qualifying PR wins** — issue OPEN ≠ no competitors (several open PRs already).
3. No formal GitHub assignee required. **Do not** post a fake “assigned to me” claim.
4. This workspace bot will **not** push, comment on the issue, or invent a claim.
5. Fill Solana wallet only with the user’s real address when they open the PR.

## Scripts

| Script | Purpose |
|---|---|
| `npm test` | Unit tests with mocked venue HTTP + x402 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run dev` | Watch server |
| `npm start` | Production-ish local serve |

## Out of scope for this folder

No `git push`. No issue comments. No invented claim / assignment. No fabricated Solana address.
