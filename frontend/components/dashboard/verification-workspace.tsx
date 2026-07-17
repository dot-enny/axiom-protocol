"use client";

import { useCallback, useEffect, useState } from "react";
import { signTransaction } from "@stellar/freighter-api";
import { Networks } from "@stellar/stellar-sdk";
import { Dropzone } from "@/components/dashboard/dropzone";
import { TerminalConsole } from "@/components/dashboard/terminal-console";
import { Button } from "@/components/ui/button";
import { WalletModal } from "@/components/WalletModal";
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
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  // Set when "Anchor" is clicked with no wallet connected yet, so the
  // pipeline can resume automatically once the modal's connect succeeds
  // instead of making the user click "Anchor" a second time.
  const [pendingAnchor, setPendingAnchor] = useState(false);
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
    setPendingAnchor(false);
    setStatus("processing");
  }

  const handleSequenceComplete = useCallback(() => setStatus("done"), []);

  const runAnchor = useCallback(
    async (issuerAddress: string, targetFile: VerifiedFile) => {
      setIsAnchoring(true);

      try {
        appendLine("[NETWORK] Simulating transaction payload...");
        const unsignedTx = await buildAnchorProofTransaction(
          issuerAddress,
          targetFile.hash
        );
        const preparedTx = await prepareAnchorProofTransaction(unsignedTx);

        appendLine("[NETWORK] Requesting Freighter signature...");
        const signResult = await signTransaction(preparedTx.toXDR(), {
          networkPassphrase: Networks.TESTNET,
          address: issuerAddress,
        });
        if (signResult.error) {
          throw new Error(signResult.error.message);
        }

        appendLine("[NETWORK] Submitting to Stellar Testnet...");
        const hash = await submitSignedTransaction(signResult.signedTxXdr);
        await confirmTransaction(hash);

        appendLine("[SOROBAN] Anchor confirmed. Ledger state updated.");
        addRecord({
          filename: targetFile.name,
          hash: targetFile.hash,
          issuer: issuerAddress,
        });
        setAnchorResult({ timestampIso: new Date().toISOString() });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        appendLine(`[ERROR] Transaction failed: ${message}`);
      } finally {
        setIsAnchoring(false);
      }
    },
    [appendLine]
  );

  function handleAnchorClick() {
    if (!file || isAnchoring) return;

    if (!address) {
      setPendingAnchor(true);
      setIsWalletModalOpen(true);
      return;
    }

    void runAnchor(address, file);
  }

  // The wallet modal closes itself on a successful connection — once
  // that happens, resume the anchor the user actually asked for.
  useEffect(() => {
    if (!pendingAnchor || !address || !file) return;
    setPendingAnchor(false);
    void runAnchor(address, file);
  }, [pendingAnchor, address, file, runAnchor]);

  function handleDownloadReceipt() {
    if (!file || !address || !anchorResult) return;

    void downloadComplianceReceipt({
      hash: file.hash,
      contractId: process.env.NEXT_PUBLIC_CONTRACT_ID ?? "Unknown",
      issuer: address,
      timestampIso: anchorResult.timestampIso,
    });
  }

  return (
    <div className="border-b border-black">
      <div className="grid grid-cols-1 divide-y divide-black md:grid-cols-2 md:divide-x md:divide-y-0">
        <Dropzone
          status={status}
          file={file}
          isAnchoring={isAnchoring}
          onFileDropped={handleFileDropped}
        />
        <TerminalConsole
          status={status}
          file={file}
          onSequenceComplete={handleSequenceComplete}
          extraLines={terminalLines}
        />
      </div>

      <div className="flex items-center justify-between border-t border-black px-6 py-6 md:px-10">
        <p className="font-mono text-xs uppercase tracking-widest">
          {anchorStatusLabel(status, Boolean(address), Boolean(anchorResult))}
        </p>
        {anchorResult ? (
          <Button onClick={handleDownloadReceipt} className="px-6 py-3 text-xs">
            Download Receipt
          </Button>
        ) : (
          <Button
            disabled={status !== "done" || isAnchoring}
            onClick={handleAnchorClick}
            className="px-6 py-3 text-xs"
          >
            Anchor to Soroban
          </Button>
        )}
      </div>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false);
          // Only clear the pending intent if the modal closed without a
          // connection — if it auto-closed *because* one succeeded,
          // `address` is already set and the resume effect above should
          // still fire.
          if (!address) setPendingAnchor(false);
        }}
      />
    </div>
  );
}
