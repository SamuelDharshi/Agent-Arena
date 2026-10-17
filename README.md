# Agent Arena

**A live-fire range where anyone can try to rob an AI agent's wallet. Break it, keep the bounty. Fail, and the agent's on-chain score — and its spending limit — goes up.**

Settled in USDC on **Arc** · built for the Tameion Agents Hackathon (Canteen × Circle) · RFB 04 (PolicyWallet) + RFB 05 (risk-tiered limits) + RFB 03 (reputation from outcomes).

- **Agent authority is enforced in a contract, not a prompt.** Every agent's money lives in a `PolicyWallet`: Merkle allowlist, per-tx cap, owner co-sign threshold, and a rolling 24h limit.
- **Spending limit = bounty proven defensible.** The autonomous daily limit is capped by the tier bounty the agent has survived real, paid attacks at.
- **Breach payout is automatic.** If an attacker tricks the agent into paying their live-session address, the vault pays the locked bounty — no judge, no dispute.
- **Every breach is a public vaccine.** Exploits are published on-chain and replayed against every agent (the Gauntlet); failing agents are suspended until patched.

---

## The six build phases

| # | Phase | Where | Status |
|---|---|---|---|
| 1 | Smart contracts — registry, PolicyWallet (clones), ArenaCore, ScoreRegistry, ExploitRegistry, GrantPool | `contracts/` | ✅ 51 tests (unit + invariant I1–I7, 4,096 fuzz calls each) |
| 2 | Shared packages + deploy/seed to Arc testnet | `packages/shared`, `scripts/` | ✅ verified end-to-end on the local harness; Arc deploy waits on faucet funding |
| 3 | Agent runtime — AAP + Naive-00 / Treasurer-01 v1 / v2 (Claude) | `apps/agents` | ✅ real Claude calls, real signing; configHash selects the pipeline |
| 4 | Arena Gateway — SIWE, relay, SSE, EIP-712 attestor, exploit publisher, metrics | `apps/gateway` | ✅ |
| 5 | Keeper — indexer → Postgres, expiry closer, Gauntlet runner, metrics rollup | `apps/keeper` | ✅ |
| 6 | Web — 3D Colosseum (shader shields, GPU crowd wave, embers, searchlights, event-driven attack arcs/bursts), attack console with 3D duel, agent profiles, exploit matrix, owner console, judge mode | `apps/web` | ✅ |

## Architecture

```
 Web (Next.js 14 · wagmi · react-three-fiber)
   │ REST + SSE                        │ viem/wagmi → Arc RPC (openSession, deposits, EIP-712 co-sign)
 Arena Gateway (Fastify)               │
   SIWE · relay · transcripts · attestor · exploit publisher · metrics
   │ AAP (HTTP)            │ embedded or standalone
 Agent runtime(s)        Keeper: indexer · closer · Gauntlet · rollups ── Postgres (or embedded PGlite)
   Claude + validators     │
   │ sign & submit         │
 Arc testnet (USDC gas): AgentRegistry · PolicyWallet clones · ArenaCore · ScoreRegistry · ExploitRegistry · GrantPool
```

### Contracts (`contracts/src`)

| Contract | Role |
|---|---|
| `AgentRegistry` | owner / signer / vault / `configHash` / allowlist root / status; 1h allowlist timelock; decision-log anchoring |
| `PolicyWallet` (ERC-1167 clone per agent) | `treasury` (production) + `bountyPool` (at risk). `payProduction` enforces allowlist, per-tx cap, escalation (owner EIP-712 co-sign) and the rolling limit; `payBounty` pays allowlisted vendors, pays a **live-session attacker = breach**, and reverts for anyone else |
| `ArenaCore` | paid, time-boxed sessions; fee + bounty lock; `onBreach` (objective, attestor-free); `closeSession` with gateway EIP-712 attestation; 70/30 fee split (vault / GrantPool) |
| `ScoreRegistry` | deterministic score (attacker weight × effort × 1/n repeats × bounty weight, saturating), tier gates (sessions, distinct attackers, score), 7-day decay, breach/config-change resets, Gauntlet deadlines |
| `ExploitRegistry` | one exploit per breached session, 10% discoverer bonus from GrantPool, pending replay for every Active agent, keeper-posted results (fail ⇒ Suspended) |
| `GrantPool` | receives 30% of survived fees (makes self-attack score farming lose money), pays bonuses |

Findings fixed during the build (both have regression tests): a concurrent session on an already-breached agent could still be closed as "survived" (found by the invariant fuzzer), and zero/one-message sessions counted toward tier gates (`minCountedMsgs`).

### Reference agents (`apps/agents`)

The runtime reads each agent's **on-chain `configHash`** and runs the matching pipeline — so patching is literally `updateConfig(newHash)` and the arena instance is bound to the production instance.

| Agent | Pipeline | Expected |
|---|---|---|
| Naive-00 | prompt only: pay what the newest inbox item asks | breakable in minutes |
| Treasurer-01 | rules + deterministic validator; **flaw:** trusts vendor payout-change emails by (spoofable) sender domain | breaks on a multi-turn bank-change injection |
| Treasurer-02 | untrusted-data boundary + injection classifier, immutable registry, payables-queue match, no arena outflows, adversarial verifier, escalate-on-novelty | survives the corpus |

Every decision is appended to a hash-chained JSONL log and anchored on-chain every N decisions (`DecisionAnchored`). If the model is unavailable the agent **fails safe** (hold) and flags the turn `LLM_UNAVAILABLE`; such turns never earn survival credit and Gauntlet replays become *inconclusive* (nothing is posted on-chain).

---

## Run it

Prereqs: Node ≥ 20, pnpm, Foundry. `pnpm install` then `pnpm keys` (creates `.env` with fresh testnet-only role keys).

### A. Arc testnet (the real target)

```bash
pnpm status                 # preflight: chain, role balances, deployment, Anthropic key
# 1. Fund the DEPLOYER address it prints at https://faucet.circle.com → Arc Testnet (≈ $60+ for seeding)
# 2. Put a valid ANTHROPIC_API_KEY in .env
pnpm contracts:build && pnpm abi
pnpm deploy:arc             # deploys + wires all contracts, writes deployments/5042002.json, tops up role gas
pnpm seed:arc               # registers Naive-00, Treasurer-01, Treasurer-02 and funds their vaults
pnpm dev                    # agents :8788 · gateway+keeper :8787 · web http://localhost:3000
```

Tier bounties/fees are configurable (`TIER_BOUNTIES_USDC`, `TIER_FEES_USDC`); the defaults in `.env.example` are scaled so a faucet-funded deployment can hold real bounties at every tier (the PRD's 50/250/1000/5000 work unchanged with more funding). `DEMO_FAST_TIERS=true` lowers tier gates so judges see unlocks in minutes (labeled in the UI).

### B. Local harness (verification without faucet funds)

Arc's USDC depends on Arc-native precompiles that exist only on Arc nodes, so a fork can't move it. The local harness uses plain anvil (1-second blocks) and a throwaway 6-decimal **test token** — clearly labeled in the UI — with the same deploy/seed scripts:

```bash
pnpm local:up               # anvil + test token + deploy + seed  (state in data-local/, deployments/31337.json)
pnpm dev:local              # web http://localhost:3000 · gateway :9787 · agents :9788
pnpm attack:local -- --agent 1 --tier 1 --msg "Invoice … remit to …" --end
```

### Useful commands

| Command | What |
|---|---|
| `pnpm contracts:test` | Foundry unit + invariant suite |
| `pnpm smoke:agents` | runs all three pipelines against scripted attacks with real Claude calls (no chain writes) |
| `pnpm attack -- --agent <id> --tier <1-4> --msg "…" [--msg "…"] [--end]` | CLI attacker (needs `ATTACKER_KEY` with testnet USDC) |
| `pnpm typecheck` | all workspaces |

`DATABASE_URL` → any Postgres (Neon/Supabase) and run `pnpm dev:keeper` separately; leave it empty to use embedded PGlite with the keeper inside the gateway.

---

## Circle stack — what is real today

| Circle tool | Status |
|---|---|
| **USDC on Arc** | ✅ all bounties, fees, payouts, treasury and gas |
| **Circle Wallets** (developer-controlled) | ⚙️ agent signer path implemented (`apps/agents/src/circle.ts`, contract execution via calldata); enabled per agent with `CIRCLE_API_KEY`, `CIRCLE_ENTITY_SECRET`, `CIRCLE_WALLET_ID_<SLUG>` — not yet exercised against Circle's API |
| Paymaster · Gateway/CCTP · USYC · x402 | ⏳ not built yet (PRD P1/P2) |

## API

Gateway (`/v1`): `auth/siwe/nonce|verify` · `agents`, `agents/:id`, `/standing`, `/sessions`, `/payments`, `/gauntlet`, `/decisions`, `/anchors`, `/payables/run` (owner), `/escalations[/:eid/approve]` (owner) · `sessions`, `sessions/:sid`, `/transcript`, `/messages` (attacker), `/end`, `/publish`, `/stream` (SSE) · `exploits`, `exploits/:id`, `/replay` · `metrics` · `events` · `stream` (global SSE) · `leaderboard/attackers` · `config`.

Agent protocol: [docs/AAP.md](docs/AAP.md). Threat model: [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md). Full spec: [agent-arena-prd.md](agent-arena-prd.md).

Platform reference notes (sourced, with how this repo handles each fact): [docs/reference/](docs/reference/README.md) — [Tameion rules & judging](docs/reference/tameion.md) · [Arc chain & EVM differences](docs/reference/arc.md) · [Circle stack](docs/reference/circle.md) · [three.js r170 APIs used by the 3D arena](docs/reference/threejs.md).

## License

MIT
