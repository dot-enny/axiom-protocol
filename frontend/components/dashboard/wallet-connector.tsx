"use client";

import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/dashboard/wallet-context";
import { truncateMiddle } from "@/lib/format";

const WRAPPER = "md:mx-6 md:mb-6";
const FREIGHTER_URL = "https://www.freighter.app/";

export function WalletConnector() {
  const { state, address, error, isWalletMissing, connect, disconnect } =
    useWallet();

  if (state === "connected" && address) {
    return (
      <div className={WRAPPER}>
        <div className="border border-black px-4 py-2 text-center font-mono text-xs uppercase tracking-widest md:py-3">
          {truncateMiddle(address, 4, 4)}
        </div>
        <button
          onClick={disconnect}
          className="mt-2 w-full font-mono text-[11px] uppercase tracking-widest text-slate-500 transition-colors duration-100 hover:text-black"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // A missing extension isn't recoverable by retrying — guide the user to
  // install one instead of offering a button that will just fail again.
  if (state === "error" && isWalletMissing) {
    return (
      <div className={WRAPPER}>
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-slate-500">
          Stellar wallet required.
        </p>
        <Button
          href={FREIGHTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full px-4 py-2 text-xs md:py-3"
        >
          Get Freighter Wallet
        </Button>
      </div>
    );
  }

  return (
    <div className={WRAPPER}>
      <Button
        onClick={connect}
        disabled={state === "connecting"}
        className="w-full px-4 py-2 text-xs md:py-3"
      >
        {state === "connecting" && "Connecting..."}
        {state === "error" && "Retry Connection"}
        {state === "disconnected" && "Connect Wallet"}
      </Button>
      {state === "error" && error && (
        <p className="mt-2 max-w-[200px] font-mono text-[11px] text-slate-500">
          {error}
        </p>
      )}
    </div>
  );
}
