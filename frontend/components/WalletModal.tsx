"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/dashboard/wallet-context";
import { isFreighterInstalled } from "@/lib/wallet";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FreighterDetection = "detecting" | "not-installed" | "installed";

const FREIGHTER_URL = "https://www.freighter.app/";

/** Re-checks for the Freighter extension each time the modal opens. */
function useFreighterDetection(isOpen: boolean): FreighterDetection {
  const [detection, setDetection] = useState<FreighterDetection>("detecting");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setDetection("detecting");

    isFreighterInstalled().then((installed) => {
      if (!cancelled) setDetection(installed ? "installed" : "not-installed");
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  return detection;
}

interface WalletOptionProps {
  icon: string;
  name: string;
  subtext: string;
  action: ReactNode;
  /** Muted, non-interactive treatment for wallets with no real integration. */
  disabled?: boolean;
}

function WalletOption({
  icon,
  name,
  subtext,
  action,
  disabled,
}: WalletOptionProps) {
  return (
    <div className="flex items-center justify-between gap-4 px-6 py-5 transition-colors duration-100">
      <div className="flex items-center gap-4">
        <span className="flex h-9 shrink-0 items-center justify-center font-mono text-xs font-bold">
          {`[ ${icon} ]`}
        </span>
        <div>
          <p className="font-mono text-sm font-bold uppercase tracking-widest">
            {name}
          </p>
          <p
            className={`mt-0.5 font-mono text-xs ${disabled ? "" : "text-slate-500"}`}
          >
            {subtext}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

/**
 * Enterprise-grade wallet connection gate. Rendered by any flow that
 * requires a connected wallet before proceeding (e.g. the Anchor
 * action) — callers pass `isOpen`/`onClose` and check `useWallet()`'s
 * `address` themselves before/after showing it.
 */
export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { state, connect } = useWallet();
  const freighterDetection = useFreighterDetection(isOpen);

  // A successful connection satisfies the reason the modal was opened —
  // close it automatically rather than making the user dismiss it too.
  useEffect(() => {
    if (isOpen && state === "connected") onClose();
  }, [isOpen, state, onClose]);

  if (!isOpen) return null;

  const freighterSubtext =
    freighterDetection === "detecting"
      ? "Detecting..."
      : freighterDetection === "not-installed"
        ? "Extension not found"
        : "Stellar wallet extension";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.12, ease: "linear" }}
        className="w-full max-w-md border-2 border-black bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b-2 border-black px-6 py-4">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest sm:text-sm">
            {"AUTHORIZATION REQUIRED // CONNECT WALLET"}
          </h2>
          <button
            onClick={onClose}
            className="shrink-0 font-mono text-xs uppercase tracking-widest text-slate-500 transition-colors duration-100 hover:text-black"
          >
            {"[ X ] CLOSE"}
          </button>
        </div>

        <div className="divide-y divide-black">
          <WalletOption
            icon="F"
            name="Freighter"
            subtext={freighterSubtext}
            action={
              freighterDetection === "not-installed" ? (
                <Button
                  href={FREIGHTER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs"
                >
                  Install
                </Button>
              ) : (
                <Button
                  onClick={connect}
                  disabled={
                    freighterDetection === "detecting" || state === "connecting"
                  }
                  className="px-3 py-1.5 text-xs"
                >
                  {state === "connecting" ? "Connecting..." : "Connect"}
                </Button>
              )
            }
          />
          <WalletOption
            icon="A"
            name="Albedo"
            subtext="Browser-based web wallet"
            disabled
            action={
              <span className="border border-slate-400 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-slate-400">
                Coming Soon
              </span>
            }
          />
          <WalletOption
            icon="X"
            name="xBull"
            subtext="Desktop & Mobile extension"
            disabled
            action={
              <span className="border border-slate-400 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-slate-400">
                Coming Soon
              </span>
            }
          />
        </div>

        {state === "error" && (
          <p className="border-t-2 border-black px-6 py-4 font-mono text-xs text-slate-500">
            Connection failed. Try again.
          </p>
        )}
      </motion.div>
    </div>
  );
}
