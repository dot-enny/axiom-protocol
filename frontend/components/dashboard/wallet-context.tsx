"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  checkExistingConnection,
  connectFreighterWallet,
  FreighterNotFoundError,
} from "@/lib/wallet";

type WalletConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

interface WalletContextValue {
  state: WalletConnectionState;
  address: string | null;
  error: string | null;
  /** True when `error` is specifically "the extension isn't installed". */
  isWalletMissing: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletConnectionState>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isWalletMissing, setIsWalletMissing] = useState(false);

  // Freighter remembers per-site authorization itself, so a page reload
  // shouldn't force a fresh "Connect" click if the user already granted
  // access in an earlier visit — restore it silently, without prompting.
  useEffect(() => {
    let cancelled = false;
    checkExistingConnection().then((existingAddress) => {
      if (!cancelled && existingAddress) {
        setAddress(existingAddress);
        setState("connected");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(() => {
    setState("connecting");
    setError(null);
    setIsWalletMissing(false);
    connectFreighterWallet()
      .then((connectedAddress) => {
        setAddress(connectedAddress);
        setState("connected");
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to connect wallet.");
        setIsWalletMissing(err instanceof FreighterNotFoundError);
        setState("error");
      });
  }, []);

  // Only forgets the connection on this app's side — Freighter itself
  // still remembers the site was authorized, so a later "Connect" click
  // reconnects without a fresh permission prompt. Revoking that
  // authorization entirely is done from within the extension itself.
  const disconnect = useCallback(() => {
    setAddress(null);
    setState("disconnected");
    setError(null);
    setIsWalletMissing(false);
  }, []);

  return (
    <WalletContext.Provider
      value={{ state, address, error, isWalletMissing, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
}
