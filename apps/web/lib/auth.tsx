"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { createSiweMessage } from "viem/siwe";
import { api } from "./api";
import { CHAIN_ID, GATEWAY } from "./wagmi";

interface AuthCtx {
  token: string | null;
  address: string | null;
  signIn: () => Promise<string>;
  signOut: () => void;
  signingIn: boolean;
}

const Ctx = createContext<AuthCtx | null>(null);
const KEY = "arena.auth";

function readStored(): { token: string; address: string } | null {
  try {
    const v = localStorage.getItem(KEY);
    return v ? (JSON.parse(v) as { token: string; address: string }) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [state, setState] = useState<{ token: string; address: string } | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    const s = readStored();
    if (s && address && s.address.toLowerCase() === address.toLowerCase()) setState(s);
    else setState(null);
  }, [address]);

  const signIn = useCallback(async () => {
    if (!address) throw new Error("connect a wallet first");
    if (state && state.address.toLowerCase() === address.toLowerCase()) return state.token;
    setSigningIn(true);
    try {
      const { nonce } = await api<{ nonce: string }>("/v1/auth/siwe/nonce", { method: "POST", body: "{}" });
      const message = createSiweMessage({
        address,
        chainId: CHAIN_ID,
        domain: window.location.host,
        nonce,
        uri: window.location.origin,
        version: "1",
        statement: `Sign in to Agent Arena (${GATEWAY})`,
      });
      const signature = await signMessageAsync({ message });
      const res = await api<{ token: string; address: string }>("/v1/auth/siwe/verify", {
        method: "POST",
        body: JSON.stringify({ message, signature }),
      });
      const next = { token: res.token, address: res.address };
      setState(next);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — token stays in memory */
      }
      return res.token;
    } finally {
      setSigningIn(false);
    }
  }, [address, signMessageAsync, state]);

  const signOut = useCallback(() => {
    setState(null);
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  return (
    <Ctx.Provider value={{ token: state?.token ?? null, address: state?.address ?? null, signIn, signOut, signingIn }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside AuthProvider");
  return c;
}
