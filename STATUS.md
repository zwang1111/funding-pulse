# STATUS — Perps Funding Pulse (daydreamsai #8)

**Updated:** 2026-10-29  
**Remote:** https://github.com/zwang1111/funding-pulse  
**Branch:** `main`  
**Claim:** **not claimed.** Do not invent a claim. Do not open a PR to `daydreamsai/agent-bounties`.

## GitHub

App source lives on `main` of https://github.com/zwang1111/funding-pulse.

## Deploy (public HTTPS)

**Public HTTPS deploy: TODO.** No public URL yet (`fly` / Railway / Render). Unpaid invoke → HTTP 402 was checked locally only; re-verify on the public host after deploy. See `DEPLOY.md`.

## Solana payout

**Solana payout address: TODO for the user.** Do not invent a receive address. The demo `ADDRESS` used for the base-sepolia x402 paywall is not a Solana bounty payout address.

## Done (app, local)

- Hyperliquid + Binance adapters and pulse score
- Agent-kit HTTP: `/health`, `/.well-known/agent.json`, `POST /entrypoints/funding-pulse/invoke`
- Convenience `GET /v1/funding`, `/v1/pulse`, `/v1/x402-status`
- x402: unpaid invoke → HTTP 402 when `ADDRESS` is set (local)
- Deploy files: `Dockerfile`, `fly.toml`, `railway.toml`, `render.yaml`, `DEPLOY.md`
- Draft `submissions/funding-pulse.md` (public URL and Solana still `TODO`)

## Not done

1. **Public HTTPS deploy** — still TODO
2. Re-verify unpaid → 402 on that public host
3. **Solana payout address** — TODO; user must supply it
4. Bounty submission / claim — user only; do not invent a claim; do not open a PR to `daydreamsai/agent-bounties`
