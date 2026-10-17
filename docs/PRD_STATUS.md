# PRD status — what is done, what is proven, what is not

Checked against [agent-arena-prd.md](../agent-arena-prd.md) on 2026-10-17. Legend: ✅ done and exercised on Arc testnet · 🟡 built, but not yet exercised live (or only partly) · ❌ not built · 👤 needs the project owner.

Live numbers (`/v1/metrics`, before the x402 run): 7 registered agents (3 active reference agents on Circle wallets), 4 attackers, 5 sessions opened (4 survived, 1 breach by the verification fixture), $8.95 moved on the production path (4 autonomous payments, 1 escalation), 0 exploits published so far.

## P0 — the demo-able core

| ID | Requirement | Status | Evidence |
|---|---|---|---|
| P0-1 | Registry + factory + PolicyWallet on Arc testnet | ✅ | Contracts deployed ([addresses](../README.md#11-live-deployment-arc-testnet)); agents #5–#7 registered and funded by script. The Owner-console wizard is built but registration was done with `pnpm seed:arc` |
| P0-2 | Production payments gated by allowlist, cap, rolling limit, escalation | ✅ | 51 contract tests; live: a $4 payment at the T0 floor was escalated to the owner, then paid autonomously after the tier unlock (below) |
| P0-3 | `openSession` with fee + bounty lock, ≤ 2 clicks | ✅ | Attack page: one **Start round** button (approve → open → sign-in) |
| P0-4 | Attack console + gateway relay + AAP | ✅ | Console used from the UI and the CLI against the live gateway; agent reasoning shown per turn |
| P0-5 | **Automatic breach payout** | 🟡 | Breach path covered by contract tests (invariants I3, I4) and `pnpm verify:arc` (live, on a verification agent). **A breach of Naive-00 through the attack page has not been performed yet** — 👤 |
| P0-6 | Survival credit via attestation → score | ✅ | Live: Treasurer-02 (#7) and Treasurer-01 (#6) each survived a session, attested `closeSession` landed on-chain, score 0 → 29, tier 0 → T1 |
| P0-7 | Score gates `dailyLimit` | ✅ | Live on Treasurer-01: the same $4 payment **escalated at T0** (limit $2) and was **paid autonomously at T1** (limit $5), signed by its Circle wallet ([tx](https://explorer.testnet.arc.io/tx/0x26192af0e1b35a642884091517f7c40639c1ee52b0ed3a7a6d5658f3a5b9059a)) |
| P0-8 | Leaderboard + agent profile | ✅ | `/arena`, `/agent/[id]`, public, no wallet needed |
| P0-9 | Naive-00 + Treasurer-01 v1/v2 | ✅ | Scripted exploit set: Naive breaks, v1 breaks only on the multi-turn attack, v2 holds (`pnpm smoke:agents`); v2 held through live sessions |
| P0-10 | Public repo, README, deploy scripts, < 3 min video | 🟡 | README, scripts and `make demo` done. **Repo is currently private** (the GitHub API returns 404 without login) — 👤 make it public. **Video not recorded** — 👤 |

## P1 — judge multipliers

| ID | Requirement | Status | Notes |
|---|---|---|---|
| P1-1 | ExploitRegistry + auto-publish + exploit page | 🟡 | Built and tested; **0 exploits published** until the first real breach |
| P1-2 | Keeper Gauntlet + suspension | 🟡 | Built and tested; **0 Gauntlet runs** for the same reason |
| P1-3 | AAP SDK + `create-arena-agent`, ≥ 3 external agents | 🟡 | SDK and scaffolder built and tested ([`packages/aap-sdk`](../packages/aap-sdk), [`packages/create-arena-agent`](../packages/create-arena-agent)). **No external agents onboarded** — 👤 outreach |
| P1-4 | Paymaster-sponsored onboarding | ❌ | See "Circle tools" below |
| P1-5 | x402-metered messages | ✅ | `POST /v1/x402/sessions/:sid/messages` ($0.005, Circle Gateway Nanopayments, Arc testnet). Live: buyer deposited into the Gateway Wallet, paid three messages with gasless EIP-3009 authorizations, session ended and attested. API/CLI path (`pnpm x402:demo`); the web attack page does not use it yet |
| P1-6 | Cross-chain funding via Gateway/CCTP | ❌ | See "Circle tools" below |
| P1-7 | Decision-log anchoring + audit viewer | ✅ | Hash-chained log, on-chain `DecisionAnchored`, viewer on the agent page |

P2 (USYC float, auto-patch assistant, category budgets, EURC, multi-attestor, attacker reputation page, score badge): ❌ not built.

## Circle tools (PRD §9)

| Tool | Status | Detail |
|---|---|---|
| USDC on Arc | ✅ | All money, fees and gas |
| Circle Wallets | ✅ | The three active agents sign **only** through Circle developer-controlled wallets; entity secret registered; production payments and `anchorDecision` verified |
| Circle Contracts | ✅ (API) | A `GrantPool` was deployed **through Circle's Contracts API from a Circle wallet** ([0x6cb0…6783](https://explorer.testnet.arc.io/address/0x6cb06dbf56c153c7c45fd40f0a75edf446aa6783), `scripts/circle-contracts-demo.ts`). The production contracts were deployed with Foundry |
| Paymaster | ❌ | Circle's Paymaster page lists Arbitrum, Avalanche, Base, Ethereum, Optimism, Polygon and Unichain and **not Arc**, while the 2025-10-27 release notes say Arc testnet was added (see [FEEDBACK.md](../FEEDBACK.md)). On Arc, gas is already USDC, so a "pay gas in USDC" paymaster adds little; *sponsored* gas would need ERC-4337 smart accounts for attackers (a different wallet stack than the injected wallets used today) |
| Gateway / CCTP | ❌ | Needs a funded second chain to test; not attempted |
| x402 / Nanopayments | ✅ | Seller middleware on the gateway (port 8789) + buyer demo; settled through `gateway-api-testnet.circle.com` |
| USYC, EURC | ❌ | Not attempted |

## Bugs found and fixed while completing the checks

1. **Over-limit payments failed with "unknown reason" instead of escalating** — raw `eth_call` reverts were not decoded, so `EscalationRequired` never reached the escalation path (found on Treasurer-01; fixed in `apps/agents/src/chain.ts`).
2. **`closeSession` intermittently reverted `BadAttestation`** — the gateway stamped attestations with its own clock, which can run ahead of Arc's block timestamp; it now uses chain time (`apps/gateway/src/sessions.ts`).
3. **Arc accepts below-floor transactions and never mines them** — reproduced and fixed client-side; see [FEEDBACK.md](../FEEDBACK.md).

## What is left, in order of value

1. 👤 **Make the GitHub repo public** (Settings → General → Danger zone → Change visibility).
2. 👤 **Break Naive-00 once through `/attack/5`** to produce the first real breach, exploit and Gauntlet replay.
3. 👤 **`railway login`**, then deploy the gateway and agents and the web app (Vercel), and update the agents' on-chain endpoints (they still point to `localhost:8788`).
4. 👤 Record the < 3-minute demo video; complete the Tameion form, Luma and Discord steps.
5. 👤 Outreach for attackers and external agents (traction).
