"use client";
import { useCallback, useState } from "react";
import { BaseError, ContractFunctionRevertedError, type Hex, type TransactionReceipt } from "viem";
import { usePublicClient, useWalletClient } from "wagmi";
import { RECEIPT_TIMEOUT_MS } from "@arena/shared";

export interface TxStep {
  label: string;
  status: "pending" | "done" | "error";
  hash?: Hex;
  error?: string;
}

export function errorMessage(err: unknown): string {
  if (err instanceof BaseError) {
    const r = err.walk((e) => e instanceof ContractFunctionRevertedError);
    if (r instanceof ContractFunctionRevertedError) return r.data?.errorName ?? r.shortMessage;
    return err.shortMessage;
  }
  return err instanceof Error ? err.message : String(err);
}

/** Imperative tx runner with a visible step log (wallet prompt → receipt). */
export function useTxRunner() {
  const publicClient = usePublicClient();
  const { data: wallet } = useWalletClient();
  const [steps, setSteps] = useState<TxStep[]>([]);
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (label: string, send: (w: NonNullable<typeof wallet>) => Promise<Hex>): Promise<TransactionReceipt> => {
      if (!wallet || !publicClient) throw new Error("connect a wallet first");
      setBusy(true);
      setSteps((s) => [...s, { label, status: "pending" }]);
      const patch = (p: Partial<TxStep>) => setSteps((s) => s.map((x, i) => (i === s.length - 1 ? { ...x, ...p } : x)));
      try {
        const hash = await send(wallet);
        patch({ hash });
        const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS });
        if (receipt.status !== "success") throw new Error("transaction reverted");
        patch({ status: "done" });
        return receipt;
      } catch (err) {
        patch({ status: "error", error: errorMessage(err) });
        throw err;
      } finally {
        setBusy(false);
      }
    },
    [wallet, publicClient],
  );

  return { run, steps, busy, reset: () => setSteps([]), ready: !!wallet && !!publicClient, publicClient, wallet };
}
