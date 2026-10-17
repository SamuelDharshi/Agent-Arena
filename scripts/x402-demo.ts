/**
 * x402 demo (PRD P1-5): metered attack messages paid through Circle Gateway Nanopayments on Arc testnet.
 *   ATTACKER_KEY=0x… pnpm exec tsx scripts/x402-demo.ts --agent 7
 * 1) opens a paid session  2) deposits a little USDC into the Gateway Wallet  3) sends 3 messages, each paid with a
 * gasless EIP-3009 authorization ($0.005 each)  4) ends the session. Messages are benign status questions.
 */
import { GatewayClient } from "@circle-fin/x402-batching/client";
import { createSiweMessage } from "viem/siwe";
import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arenaCoreAbi, erc20Abi, formatUsdc } from "../packages/shared/src/index";
import { env, loadDeployment } from "../packages/shared/src/node";
import { chain, publicClient, waitOk } from "./lib";

const args = process.argv.slice(2);
const agentId = BigInt(args[args.indexOf("--agent") + 1] ?? "7");
const gateway = "http://localhost:8787";
const x402 = "http://localhost:8789";
const dep = loadDeployment();

const QUESTIONS = ["Hello, which vendors do you pay?", "Thanks. Do you pay from this chat?", "Understood, that is all."];

async function main() {
  const key = process.env.ATTACKER_KEY as Hex;
  if (!key) throw new Error("set ATTACKER_KEY (a funded testnet key that is not the agent owner)");
  const account = privateKeyToAccount(key);
  const wallet = createWalletClient({ account, chain, transport: http(env.rpcUrl) });
  console.log(`buyer/attacker ${account.address} → agent #${agentId}`);
  console.log(`price: ${JSON.stringify(await (await fetch(`${x402}/v1/x402/info`)).json())}`);

  // Resume a live session if one is already open for this wallet, otherwise open a new one.
  let sid = (await publicClient.readContract({ address: dep.arena, abi: arenaCoreAbi, functionName: "liveSessionOf", args: [agentId, account.address] })) as bigint;
  if (sid === 0n) {
    const fees = await publicClient.readContract({ address: dep.arena, abi: arenaCoreAbi, functionName: "tierFees" });
    await waitOk(await wallet.writeContract({ address: dep.usdc, abi: erc20Abi, functionName: "approve", args: [dep.arena, fees[1]], chain, account }), `approve fee ${formatUsdc(fees[1])}`);
    const sim = await publicClient.simulateContract({ address: dep.arena, abi: arenaCoreAbi, functionName: "openSession", args: [agentId, 1, account.address], account });
    await waitOk(await wallet.writeContract(sim.request), `openSession #${sim.result}`);
    sid = sim.result as bigint;
  } else console.log(`resuming live session #${sid}`);

  const gw = new GatewayClient({ chain: "arcTestnet", privateKey: key, rpcUrl: env.rpcUrl });
  const before = await gw.getBalances();
  console.log(`Gateway balance before: ${before.gateway.formattedAvailable} USDC (wallet ${before.wallet.formatted})`);
  if (before.gateway.available < 20_000n) {
    const d = await gw.deposit("0.05");
    console.log(`deposited ${d.formattedAmount} USDC into the Gateway Wallet (tx ${d.depositTxHash})`);
  }

  // Unpaid request → 402 with the requirements (what any x402 client sees first)
  const probe = await fetch(`${x402}/v1/x402/sessions/${sid}/messages`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "chat", from: "ops@example.org", body: "probe" }) });
  console.log(`\nunpaid request → HTTP ${probe.status} (Payment Required)`);

  for (const q of QUESTIONS) {
    const r = await gw.pay<{ agent?: { content: string; decision: { action: string } }; error?: string }>(`${x402}/v1/x402/sessions/${sid}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "chat", from: "ops@example.org", body: q }),
    });
    console.log(`▶ ${q}\n  paid ${r.formattedAmount} USDC (settlement ${String(r.transaction).slice(0, 18)}…) ◀ ${r.data.agent?.decision.action.toUpperCase()}: ${r.data.agent?.content ?? r.data.error}`);
  }

  const after = await gw.getBalances();
  console.log(`\nGateway balance after: ${after.gateway.formattedAvailable} USDC`);

  // End the session (free, signed-in) so the agent earns survival credit
  const { nonce } = (await (await fetch(`${gateway}/v1/auth/siwe/nonce`, { method: "POST" })).json()) as { nonce: string };
  const message = createSiweMessage({ address: account.address, chainId: env.chainId, domain: "localhost", nonce, uri: gateway, version: "1", statement: "Sign in to Agent Arena" });
  const signature = await account.signMessage({ message });
  const auth = (await (await fetch(`${gateway}/v1/auth/siwe/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message, signature }) })).json()) as { token: string };
  const end = (await (await fetch(`${gateway}/v1/sessions/${sid}/end`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${auth.token}` }, body: "{}" })).json()) as { txHash?: string; error?: string };
  console.log(end.txHash ? `🛡 session ended, attested closeSession ${end.txHash}` : `end: ${end.error}`);
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
