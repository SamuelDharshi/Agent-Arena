# Deploying Agent Arena (free tier)

| Part | Where | Status |
|---|---|---|
| Web app (`apps/web`) | **Vercel**, project `agent-arena` | ✅ live at https://agent-arena-tameion.vercel.app (also https://agent-arena-brown.vercel.app). `agent-arena.vercel.app` is owned by someone else |
| Agents + Gateway/Keeper + Postgres | **Render** (free), blueprint [`render.yaml`](../render.yaml) | follow the steps below |
| Contracts | Arc testnet | ✅ deployed, see [deployments/5042002.json](../deployments/5042002.json) |

## Render (backend), about 10 minutes

1. Render dashboard → **New → Blueprint** → connect GitHub → pick `SamuelDharshi/Agent-Arena` → it reads `render.yaml` (two web services and one free Postgres).
2. It asks for the secrets marked `sync: false`. Open the git-ignored local file `data/render-env.txt` and paste each value into the matching service (it is split into "agent-arena-agents" and "agent-arena-gateway"). Never commit that file.
3. **Apply.** Wait for both services to show *Live*. Their URLs should be `https://agent-arena-agents.onrender.com` and `https://agent-arena-gateway.onrender.com` (if Render adds a suffix because the name is taken, use the real URL below and in step 5).
4. Check: `https://agent-arena-gateway.onrender.com/v1/config` returns JSON and `https://agent-arena-agents.onrender.com/health` returns `ok`.
5. Point the agents at their hosted endpoints on-chain (they still say `localhost:8788`):
   `HOSTED_AGENTS_URL=https://agent-arena-agents.onrender.com pnpm exec tsx scripts/set-endpoints.ts`
6. If the gateway URL is not `https://agent-arena-gateway.onrender.com`, update the Vercel variable and redeploy:
   `vercel env add NEXT_PUBLIC_GATEWAY_URL production --force` then `vercel --prod`.

Free-plan limits: services sleep after about 15 minutes without traffic (the first request then takes about 50 seconds); the keeper only runs while the gateway is awake and catches up from its saved cursor when it wakes. A free uptime pinger (for example UptimeRobot hitting `/v1/config` every 5 minutes) keeps it awake. The x402 paywall runs on an internal port and is exposed through the gateway's own public port (`/v1/x402/*`), so it works on Render.

## Operations

- **Gas:** the gateway attestor, the keeper and the Circle agent wallets pay gas in USDC. If one runs dry, closing rounds fails and bounties stay locked until expiry. `GET /v1/health` shows the balances and `lowGas`; top up with `pnpm exec tsx scripts/topup-gas.ts` (Circle reserves about $0.4 per transaction, so keep agent wallets near $1+).
- **One keeper per chain:** do not run a second gateway with an embedded keeper against the same chain (a local dev gateway next to the hosted one). A keeper whose database lacks a round's transcript expires it as idle and the agent loses its survival credit. Start dev gateways with `KEEPER_DISABLED=1`.

## Vercel (web)

Already configured: root directory `apps/web`, variables `NEXT_PUBLIC_GATEWAY_URL`, `NEXT_PUBLIC_CHAIN_ID`, `NEXT_PUBLIC_RPC_URL`; pushes to `main` redeploy automatically (the repo is connected). Manual deploy: `vercel --prod` from the repository root.

## Local

`pnpm dev` runs everything on your machine (agents :8788, gateway + keeper :8787, x402 :8789, web :3000); see the README.
