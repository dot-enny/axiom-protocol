"use client";

import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/dashboard/wallet-context";
import { truncateMiddle } from "@/lib/format";

const POSITION = "text-xs md:mx-6 md:mb-6";

export function WalletConnector() {
  const { state, address, error, connect } = useWallet();

  if (state === "connected" && address) {
    return (
      <div
        className={`border border-black px-4 py-2 text-center font-mono uppercase tracking-widest md:py-3 ${POSITION}`}
      >
        {truncateMiddle(address, 4, 4)}
      </div>
    );
  }

  return (
    <Button
      onClick={connect}
      disabled={state === "connecting"}
      title={error ?? undefined}
      className={`px-4 py-2 md:py-3 ${POSITION}`}
    >
      {state === "connecting" && "Connecting..."}
      {state === "error" && "Retry Connection"}
      {state === "disconnected" && "Connect Wallet"}
    </Button>
  );
}
