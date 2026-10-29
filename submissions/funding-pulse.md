# Submission: Perps Funding Pulse — Bounty #8

**Related issue:** [#8 — Perps Funding Pulse](https://github.com/daydreamsai/agent-bounties/issues/8)  
**Agent:** `perps-funding-pulse` v0.2.0  
**Local workspace:** `/workspace/web3-earn/daydreamsai-funding-pulse/`  
**Agent source repo:** https://github.com/zwang1111/funding-pulse  
**Submitter GitHub:** zwang1111

## Live deployment

| Endpoint | Method | Payment |
|---|---|---|
| `https://funding-pulse.onrender.com/health` | GET | free |
| `https://funding-pulse.onrender.com/.well-known/agent.json` | GET | free |
| `https://funding-pulse.onrender.com/v1/funding?venues=hyperliquid&markets=BTC` | GET | free probe |
| `https://funding-pulse.onrender.com/v1/x402-status` | GET | free |
| `https://funding-pulse.onrender.com/entrypoints/funding-pulse/invoke` | POST | **x402** (unpaid → HTTP 402) |

Public deploy: Render Live (see STATUS.md). Fly/Railway optional backups in DEPLOY.md.

### How to verify x402 (local facts — same routes after deploy)

```bash
# From workspace (free local — no ADDRESS)
cd /workspace/web3-earn/daydreamsai-funding-pulse
npm test && npm run typecheck
npm start
# → http://127.0.0.1:8787

# Enable real unpaid→402 locally
ADDRESS=0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429 \
NETWORK=base-sepolia DEFAULT_PRICE=0.01 \
npm start

curl -si -X POST http://127.0.0.1:8787/entrypoints/funding-pulse/invoke \
  -H 'content-type: application/json' -H 'accept: application/json' \
  -d '{"input":{"venue_ids":["hyperliquid"],"markets":["BTC"]}}' | head -40
# Expect: HTTP/1.1 402 … body includes error + accepts[] + x402Version

# Free probes still work
curl -s 'http://127.0.0.1:8787/v1/funding?venues=hyperliquid&markets=BTC' | head
curl -s http://127.0.0.1:8787/v1/x402-status
curl -s http://127.0.0.1:8787/.well-known/agent.json | head

# Bypass / free mode for local: unset ADDRESS or X402_ENABLED=0
# Stub-only 402: X402_STUB=1 + ADDRESS; bypass header X-PAYMENT-BYPASS: 1
```

After public deploy, repeat the same curls against `https://funding-pulse.onrender.com`.

## Agent description

Near-live perps funding agent built with `@lucid-dreams/agent-kit` + Hono.

- **Venues:** Hyperliquid (`metaAndAssetCtxs`), Binance USDT-M (`premiumIndex` + OI + L/S ratio)
- **Returns per row:** `funding_rate`, `time_to_next`, `open_interest`, `skew` (+ optional mark / errors)
- **Pulse:** `pulse_score` 0–100 (50 ≈ flat), label cold→hot
- **HTTP:** kit routes + convenience `GET /v1/funding`, `GET /v1/pulse`, `GET /v1/x402-status`
- **x402:** unpaid `POST /entrypoints/funding-pulse/invoke` → HTTP 402 when `ADDRESS` set

Note: some egress IPs get Binance **403**; adapters soft-fail per row. Hyperliquid is stable. Prefer a clean deploy egress.

## Acceptance criteria checklist

- [x] Returns `funding_rate`, `time_to_next`, `open_interest`, `skew` for requested `venue_ids` + `markets[]` (local verified)
- [x] Near real-time (HTTP fetch on each invoke; no multi-hour cache)
- [ ] Live UI tolerance check from clean IP vs venue screens
- [x] Deployed on stable public domain: https://funding-pulse.onrender.com (Render Live 2026-10-29)
- [x] x402 path implemented; **re-verified on public URL** 2026-10-29 22:15 CST (unpaid POST → HTTP 402, base-sepolia)
- [x] `GET /.well-known/agent.json` discoverable
- [ ] **TODO:** PR into `daydreamsai/agent-bounties` under `submissions/` linking **#8** (user/zwang1111; do not invent claim)
- [ ] **TODO(solana-receive-address):** Solana wallet for payout — **user-provided only; never invent**

## Solana wallet address for payment

```
TODO(solana-receive-address)
```

## Additional resources

- Local path: `/workspace/web3-earn/daydreamsai-funding-pulse/`
- Deploy: `DEPLOY.md` (Fly / Railway / Render / Docker)
- Tests: `npm test` (includes x402 stub + real unpaid→402 via agent-kit)
- Stack: Node ≥20, TypeScript, `@lucid-dreams/agent-kit`, Zod, Hono
