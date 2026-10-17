# Tameion Agents Hackathon — reference

Source: <https://tameion.thecanteenapp.com/> (fetched 2026-10-12). Canteen × Circle, settled on Arc. Third event after Agora and Lepton.

## Key facts

| | |
|---|---|
| Window | Sep 27 → **Oct 17, 11:59 PM ET** (submit as many times as you like before the deadline) |
| Format | Online, invite-only, **asynchronous judging** — no live demo day |
| Platform rule | Must run on **Arc** with payments in **USDC** on the Circle Agent Stack. Testnet or mainnet; **mainnet is valued more** |
| Usage rule | Genuine usage by real businesses — synthetic data doesn't count. Your own company or an OSS project you maintain counts |
| Existing projects | Only progress made during Tameion is judged |
| Handles | GitHub + Discord handles must be entered exactly (submissions are collated by them) |

## Judging (recommended weights)

| Criterion | Weight | How Agent Arena answers it |
|---|---|---|
| Agentic sophistication | 30% | agents decide pay/hold/escalate/refuse under live adversarial pressure; v2 pipeline (classifier → plan → validate → adversarial verify → commit); decision log anchored on-chain |
| Traction | 30% | attackers and external agents are users; `/v1/metrics` + footer counters (see README) |
| Circle tool usage | 20% | USDC on Arc everywhere; Circle Wallets signer path; Paymaster/CCTP/Gateway/USYC/x402 are next — see [circle.md](circle.md) |
| Innovation | 20% | spending limit = bounty proven defensible; exploit commons + Gauntlet |

## Requests for Builders (prompts, not tracks)

- **RFB 01 Intelligent Business Treasury** — forecast cash, allocate, park idle funds in USYC.
- **RFB 02 AP/AR Automation Agent** — parse invoices, timing, collections, duplicate/fraud detection, vendor wallet screening.
- **RFB 03 Contractor & Vendor Network Manager** — milestone payments, onboarding screening, **reputation scored from delivery**.
- **RFB 04 Autonomous Business Operator** — receive & hold USDC, pay obligations, stay within budgets and approval limits; show one full workflow: *receive revenue → assess liquidity → pay or purchase → record the decision → escalate only when a policy threshold is reached*. Examples: OperatorAI, **PolicyWallet**.
- **RFB 05 Compliance Intelligence Agent** — continuous monitoring, **risk-tiered transaction limits**, EDD triggers, exposure mapping.

Agent Arena targets RFB 04 (`PolicyWallet`, escalation via owner co-sign), with RFB 05 (tier-gated limits) and RFB 03 (reputation from outcomes).

FAQ guidance on autonomy: *"Enough to be useful, bounded by limits it cannot override"* — contract enforcement, human-approval thresholds, complete post-hoc records. (Implemented in `contracts/src/PolicyWallet.sol` and `apps/agents/src/log.ts`.)

## Submission checklist

- [ ] Public GitHub repo (judges read it directly)
- [ ] Demo video **< 3 minutes** (Loom / YouTube / Vimeo)
- [ ] Live product link — optional but strongly encouraged; build for a reviewer clicking around without you
- [ ] Traction answers: businesses onboarded · value the agent moved · problems solved
- [ ] Submit: <https://forms.gle/BBWrdfuircrKiG2i6>

## Getting started links

- Luma registration: <https://luma.com/ivroypr5> (passphrase in the event page)
- Canteen Discord: <https://discord.gg/bDaEfsSqc8> · Arc builder Discord: <https://discord.com/invite/buildonarc>
- ARC CLI (Canteen-hosted testnet RPC + bundled Arc docs): `uv tool install git+https://github.com/the-canteen-dev/ARC-cli` · docs <https://arc-node.thecanteenapp.com/>
- Circle CLI: `npm install -g @circle-fin/cli` (Node ≥ 20.18.2) · <https://developers.circle.com/agent-stack/circle-cli>
- Recommended reading: "Agents and Ledgers in 2026" <https://thecanteenapp.com/analysis/2026/09/12/agents-and-ledgers.html>
- TestMint (up to $10k testnet USDC via x402): <https://testmint.myproceeds.xyz/>

## Prizes

$40k total — 1st $10k · 2nd $7.5k · 3rd $5k ×3 · 10–12 standout teams share $7.5k. Follow-on funding/grants for teams that keep building.
