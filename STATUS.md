# STATUS — Perps Funding Pulse (daydreamsai #8)

**Updated:** 2026-10-29 22:15 Asia/Shanghai (UTC+8)  
**Path:** `/workspace/web3-earn/daydreamsai-funding-pulse/`  
**Remote:** https://github.com/zwang1111/funding-pulse @ `bf5b313` (main seeded via CloudAgent; PAT Contents for this repo may still be missing for local push)

## Live deployment (DONE)

| Item | Value |
|---|---|
| Public HTTPS | https://funding-pulse.onrender.com |
| Platform | Render free Docker web service `funding-pulse` (srv-dbhl8oflk1mc73d23f10) |
| Account | Google wzang1890463@gmail.com → workspace “df's workspace” |
| Health | `GET /health` → **200** `{"ok":true,"version":"0.2.0"}` (verified 2026-10-29 22:15 CST) |
| x402 unpaid | `POST /entrypoints/funding-pulse/invoke` → **402** with accepts[] network **base-sepolia**, payTo `0xb308ed39d67D0d4BAe5BC2FAEF60c66BBb6AE429` (verified same time) |
| Env | ADDRESS (demo EVM paywall), NETWORK=base-sepolia, DEFAULT_PRICE=0.01, FACILITATOR_URL=https://facilitator.daydreams.systems |

**Note:** `ADDRESS=0xb308…` is the **demo x402 HTTP paywall receiver on base-sepolia only** — **not** the Solana bounty payout address (never invent that).

## Done

- Real Hyperliquid + Binance adapters + pulse score
- Agent-kit HTTP + x402 unpaid → 402
- Deploy-ready Docker / Fly / Railway / Render configs
- Public repo zwang1111/funding-pulse
- **Public HTTPS Live on Render + unpaid 402 re-verified**
- Draft `submissions/funding-pulse.md` (public URL filled; Solana still TODO)

## Not done (FCFS claim blockers — user only)

1. **PR** into `daydreamsai/agent-bounties` `submissions/` linking **#8** (**user / zwang1111 only**; bot does not open that PR)
2. **Real Solana receive address** from user (never invent)
3. Optional: add `funding-pulse` to fine-grained PAT Contents for local push; venue UI tolerance from clean IP

## Competitors

Open PRs already on #8 (e.g. #380, #379, #375). FCFS on complete qualifying submission — move fast once Solana + PR are ready.

## Quick verify (public)

```bash
curl -s https://funding-pulse.onrender.com/health
curl -si -X POST https://funding-pulse.onrender.com/entrypoints/funding-pulse/invoke \
  -H 'content-type: application/json' -d '{}' | head -30
# Expect HTTP 402 + accepts[]
```
