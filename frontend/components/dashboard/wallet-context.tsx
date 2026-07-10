"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { connectFreighterWallet } from "@/lib/wallet";

type WalletConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

interface WalletContextValue {
  state: WalletConnectionState;
  address: string | null;
  error: string | null;
  connect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletConnectionState>("disconnected");
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(() => {
    setState("connecting");
    setError(null);
    connectFreighterWallet()
      .then((connectedAddress) => {
        setAddress(connectedAddress);
        setState("connected");
      })
      .catch((err: Error) => {
        setError(err.message);
        setState("error");
      });
  }, []);

  return (
    <WalletContext.Provider value={{ state, address, error, connect }}>
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
