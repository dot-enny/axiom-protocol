"use client";

import { useCallback, useEffect, useState } from "react";
import { signTransaction } from "@stellar/freighter-api";
import { Networks } from "@stellar/stellar-sdk";
import { Dropzone } from "@/components/dashboard/dropzone";
import { TerminalConsole } from "@/components/dashboard/terminal-console";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/components/dashboard/wallet-context";
import { sha256Hex } from "@/lib/hash";
import {
  buildAnchorProofTransaction,
  confirmTransaction,
  prepareAnchorProofTransaction,
  submitSignedTransaction,
} from "@/lib/soroban";
import { downloadComplianceReceipt } from "@/lib/pdf";
import { addRecord } from "@/lib/useLedgerStore";

export type VerificationStatus = "idle" | "processing" | "done";

export interface VerifiedFile {
  name: string;
  size: number;
  hash: string;
}

interface AnchorResult {
  timestampIso: string;
}

function anchorStatusLabel(
  status: VerificationStatus,
  walletConnected: boolean,
  anchored: boolean
): string {
  if (anchored) return "Anchor confirmed on Stellar Testnet";
  if (status !== "done") return "Awaiting a verified hash";
  if (!walletConnected) return "Hash ready — connect wallet to anchor";
  return "Hash ready — not yet anchored";
}

export function VerificationWorkspace() {
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [file, setFile] = useState<VerifiedFile | null>(null);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [anchorResult, setAnchorResult] = useState<AnchorResult | null>(null);
  const {
    address,
    state: walletState,
    error: walletError,
    isWalletMissing,
  } = useWallet();

  const appendLine = useCallback((line: string) => {
    setTerminalLines((prev) => [...prev, line]);
  }, []);

  // Wallet connection lives in a different part of the tree (the sidebar),
  // so any failure there is surfaced here too via the shared wallet
  // context, rather than only being visible next to the Connect button.
  useEffect(() => {
    if (walletState !== "error" || !walletError) return;

    if (isWalletMissing) {
      appendLine(
        "[SYSTEM] Freighter wallet not detected. Installation required: https://freighter.app"
      );
    } else {
      appendLine(`[NETWORK] Wallet connection failed: ${walletError}`);
    }
  }, [walletState, walletError, isWalletMissing, appendLine]);

  async function handleFileDropped(dropped: File) {
    const hash = await sha256Hex(dropped);
    setFile({ name: dropped.name, size: dropped.size, hash });
    setTerminalLines([]);
    setAnchorResult(null);
    setStatus("processing");
  }

  const handleSequenceComplete = useCallback(() => setStatus("done"), []);

  async function handleAnchorClick() {
    if (!file || !address || isAnchoring) return;

    setIsAnchoring(true);

    try {
      appendLine("[NETWORK] Simulating transaction payload...");
      const unsignedTx = await buildAnchorProofTransaction(address, file.hash);
      const preparedTx = await prepareAnchorProofTransaction(unsignedTx);

      appendLine("[NETWORK] Requesting Freighter signature...");
      const signResult = await signTransaction(preparedTx.toXDR(), {
        networkPassphrase: Networks.TESTNET,
        address,
      });
      if (signResult.error) {
        throw new Error(signResult.error.message);
      }

      appendLine("[NETWORK] Submitting to Stellar Testnet...");
      const hash = await submitSignedTransaction(signResult.signedTxXdr);
      await confirmTransaction(hash);

      appendLine("[SOROBAN] Anchor confirmed. Ledger state updated.");
      addRecord({ filename: file.name, hash: file.hash, issuer: address });
      setAnchorResult({ timestampIso: new Date().toISOString() });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      appendLine(`[ERROR] Transaction failed: ${message}`);
    } finally {
      setIsAnchoring(false);
    }
  }

  function handleDownloadReceipt() {
    if (!file || !address || !anchorResult) return;

    downloadComplianceReceipt({
      hash: file.hash,
      contractId: process.env.NEXT_PUBLIC_CONTRACT_ID ?? "Unknown",
      issuer: address,
      timestampIso: anchorResult.timestampIso,
    });
  }

  return (
    <div className="border-b border-black">
      <div className="grid grid-cols-1 divide-y divide-black md:grid-cols-2 md:divide-x md:divide-y-0">
        <Dropzone status={status} file={file} onFileDropped={handleFileDropped} />
        <TerminalConsole
          status={status}
          file={file}
          onSequenceComplete={handleSequenceComplete}
          extraLines={terminalLines}
        />
      </div>

      <div className="flex items-center justify-between border-t border-black px-6 py-6 md:px-10">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
          {anchorStatusLabel(status, Boolean(address), Boolean(anchorResult))}
        </p>
        {anchorResult ? (
          <Button onClick={handleDownloadReceipt} className="px-6 py-3 text-xs">
            Download Receipt
          </Button>
        ) : (
          <Button
            disabled={status !== "done" || !address || isAnchoring}
            onClick={handleAnchorClick}
            className="px-6 py-3 text-xs"
          >
            Anchor to Soroban
          </Button>
        )}
      </div>
    </div>
  );
}
