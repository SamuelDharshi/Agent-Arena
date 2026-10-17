# Deploying Agent Arena (Arc testnet, real USDC, real Claude)

## 1. Go live on Arc testnet

1. Fund the deployer printed by `pnpm status` at <https://faucet.circle.com> (Arc Testnet, ≈ $60).
2. Put a valid `ANTHROPIC_API_KEY` in `.env`.
3. `pnpm go-live` — waits until both are ready, then builds + deploys the contracts, seeds the three reference agents with real testnet USDC, and runs the real-Claude pipeline smoke test.

## 2. Host the backend (Railway — two services from this repo)

`railway login` (browser), then create one project with **two services** pointing at this repo:

| Service | Start command | Variables |
|---|---|---|
| `agents` | `pnpm start:agents` | everything from `.env` (agent keys, `VENDOR_SEED`, `ANTHROPIC_API_KEY`, `ARC_*`, `USDC_ADDRESS`) |
| `gateway` | `pnpm start:gateway` | everything from `.env` (attestor + keeper keys, `ARC_*`), `RUN_KEEPER=true`, `DATABASE_URL` from a Railway Postgres plugin, `GATEWAY_PUBLIC_URL=https://<gateway domain>` |

Both servers listen on Railway's `PORT`. Also commit `deployments/5042002.json` (the gateway, keeper and agents read contract addresses from it).

The agent endpoints are registered on-chain at seed time from `AGENTS_PUBLIC_URL`. Set `AGENTS_PUBLIC_URL=https://<agents domain>` **before** `pnpm seed:arc`, or have the owner call `AgentRegistry.updateEndpoint` / `updateMetadata` afterwards.

## 3. Host the web app (Vercel)

`cd apps/web && vercel --prod` (root directory `apps/web`; `vercel.json` installs from the monorepo root). Environment variables:

```
NEXT_PUBLIC_GATEWAY_URL=https://<gateway domain>
NEXT_PUBLIC_CHAIN_ID=5042002
NEXT_PUBLIC_RPC_URL=https://rpc.testnet.arc.io
```

## 4. Local harness

`make demo` — anvil + labeled test token + the same deploy/seed scripts + all services (web <http://localhost:3000>). See README.
