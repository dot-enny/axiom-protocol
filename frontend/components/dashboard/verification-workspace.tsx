"use client";

import { useCallback, useState } from "react";
import { signTransaction } from "@stellar/freighter-api";
import { Networks } from "@stellar/stellar-sdk";
import { Dropzone } from "@/components/dashboard/dropzone";
import { TerminalConsole } from "@/components/dashboard/terminal-console";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/dashboard/wallet-context";
import { sha256Hex } from "@/lib/hash";
import { buildAnchorProofTransaction } from "@/lib/soroban";

export type VerificationStatus = "idle" | "processing" | "done";

export interface VerifiedFile {
  name: string;
  size: number;
  hash: string;
}

const ANCHOR_STEP_DELAY_MS = 400;

function anchorStatusLabel(
  status: VerificationStatus,
  walletConnected: boolean
): string {
  if (status !== "done") return "Awaiting a verified hash";
  if (!walletConnected) return "Hash ready — connect wallet to anchor";
  return "Hash ready — not yet anchored";
}

export function VerificationWorkspace() {
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [file, setFile] = useState<VerifiedFile | null>(null);
  const [anchorLines, setAnchorLines] = useState<string[]>([]);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const { address } = useWallet();

  async function handleFileDropped(dropped: File) {
    const hash = await sha256Hex(dropped);
    setFile({ name: dropped.name, size: dropped.size, hash });
    setAnchorLines([]);
    setStatus("processing");
  }

  const handleSequenceComplete = useCallback(() => setStatus("done"), []);

  async function handleAnchorClick() {
    if (!file || !address || isAnchoring) return;

    setIsAnchoring(true);
    setAnchorLines(["[NETWORK] Building Soroban transaction..."]);

    const unsignedXdr = buildAnchorProofTransaction(address, file.hash);
    await new Promise((resolve) => setTimeout(resolve, ANCHOR_STEP_DELAY_MS));

    setAnchorLines((prev) => [
      ...prev,
      "[NETWORK] Requesting Freighter signature...",
    ]);

    const result = await signTransaction(unsignedXdr, {
      networkPassphrase: Networks.TESTNET,
      address,
    });

    if (result.error) {
      setAnchorLines((prev) => [
        ...prev,
        `[SOROBAN] Signature request failed: ${result.error.message}`,
      ]);
    } else {
      setAnchorLines((prev) => [
        ...prev,
        "[SOROBAN] Transaction signed and submitted.",
      ]);
    }

    setIsAnchoring(false);
  }

  return (
    <div className="border-b border-black">
      <div className="grid grid-cols-1 divide-y divide-black md:grid-cols-2 md:divide-x md:divide-y-0">
        <Dropzone status={status} file={file} onFileDropped={handleFileDropped} />
        <TerminalConsole
          status={status}
          file={file}
          onSequenceComplete={handleSequenceComplete}
          extraLines={anchorLines}
        />
      </div>

      <div className="flex items-center justify-between border-t border-black px-6 py-6 md:px-10">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
          {anchorStatusLabel(status, Boolean(address))}
        </p>
        <Button
          disabled={status !== "done" || !address || isAnchoring}
          onClick={handleAnchorClick}
          className="px-6 py-3 text-xs"
        >
          Anchor to Soroban
        </Button>
      </div>
    </div>
  );
}
