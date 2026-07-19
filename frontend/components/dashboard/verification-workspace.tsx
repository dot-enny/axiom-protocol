"use client";

import { useCallback, useEffect, useState } from "react";
import { signTransaction } from "@stellar/freighter-api";
import { Networks, StrKey } from "@stellar/stellar-sdk";
import { AnchorConfig } from "@/components/dashboard/anchor-config";
import { Dropzone } from "@/components/dashboard/dropzone";
import { TerminalConsole } from "@/components/dashboard/terminal-console";
import { Button } from "@/components/ui/button";
import { WalletModal } from "@/components/WalletModal";
import { useWallet } from "@/components/dashboard/wallet-context";
import { sha256Hex } from "@/lib/hash";
import {
  buildProposeDealTransaction,
  confirmTransaction,
  prepareTransaction,
  submitSignedTransaction,
  translateContractError,
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
  const [threshold, setThreshold] = useState(1);
  const [assetValue, setAssetValue] = useState(0);
  const [isNonFinancial, setIsNonFinancial] = useState(false);
  // One entry per counterparty beyond the connected wallet — always
  // kept at exactly `threshold - 1` entries so the signers array sent
  // on-chain (`[wallet, ...counterparties]`) has exactly `threshold`
  // addresses.
  const [counterparties, setCounterparties] = useState<string[]>([]);
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
    setThreshold(1);
    setAssetValue(0);
    setIsNonFinancial(false);
    setCounterparties([]);
    setStatus("processing");
  }

  const handleSequenceComplete = useCallback(() => setStatus("done"), []);

  function handleClear() {
    setFile(null);
    setStatus("idle");
    setTerminalLines([]);
    setAnchorResult(null);
    setPendingAnchor(false);
    setThreshold(1);
    setAssetValue(0);
    setIsNonFinancial(false);
    setCounterparties([]);
  }

  // Keeps `counterparties` at exactly `threshold - 1` entries whenever
  // the threshold changes, preserving already-typed addresses for the
  // entries that still fit.
  function handleThresholdChange(value: number) {
    setThreshold(value);
    setCounterparties((prev) => {
      const needed = Math.max(0, value - 1);
      const next = prev.slice(0, needed);
      while (next.length < needed) next.push("");
      return next;
    });
  }

  function handleCounterpartyChange(index: number, value: string) {
    setCounterparties((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  const runAnchor = useCallback(
    async (issuerAddress: string, targetFile: VerifiedFile) => {
      const trimmedCounterparties = counterparties.map((c) => c.trim());
      if (
        trimmedCounterparties.some(
          (c) => !c || !StrKey.isValidEd25519PublicKey(c)
        )
      ) {
        appendLine(
          "[ERROR] Every counterparty address must be a valid Stellar public key before anchoring."
        );
        return;
      }
      const signers = [issuerAddress, ...trimmedCounterparties];

      setIsAnchoring(true);

      try {
        appendLine("[NETWORK] Simulating deal proposal payload...");
        const unsignedTx = await buildProposeDealTransaction(
          issuerAddress,
          targetFile.hash,
          signers,
          threshold
        );
        const preparedTx = await prepareTransaction(unsignedTx);

        appendLine("[NETWORK] Requesting Freighter signature...");
        const signResult = await signTransaction(preparedTx.toXDR(), {
          networkPassphrase: Networks.TESTNET,
          address: issuerAddress,
        });
        if (signResult.error) {
          throw new Error(signResult.error.message);
        }

        appendLine("[NETWORK] Submitting to Stellar Testnet...");
        const txHash = await submitSignedTransaction(signResult.signedTxXdr);
        await confirmTransaction(txHash);

        appendLine("[SOROBAN] Deal proposed on-chain. Awaiting required approvals.");
        addRecord({
          filename: targetFile.name,
          hash: targetFile.hash,
          issuer: issuerAddress,
          txHash,
          value: isNonFinancial ? 0 : assetValue,
          threshold,
        });
        setAnchorResult({ timestampIso: new Date().toISOString() });
      } catch (err) {
        const translated = translateContractError(err);
        if (translated) {
          appendLine(translated);
        } else {
          const message = err instanceof Error ? err.message : "Unknown error";
          appendLine(`[ERROR] Transaction failed: ${message}`);
        }
      } finally {
        setIsAnchoring(false);
      }
    },
    [appendLine, threshold, assetValue, isNonFinancial, counterparties]
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
        <div>
          <Dropzone
            status={status}
            file={file}
            isAnchoring={isAnchoring}
            onFileDropped={handleFileDropped}
            onClear={handleClear}
          />
          <AnchorConfig
            threshold={threshold}
            onThresholdChange={handleThresholdChange}
            assetValue={assetValue}
            onAssetValueChange={setAssetValue}
            isNonFinancial={isNonFinancial}
            onNonFinancialChange={setIsNonFinancial}
            counterparties={counterparties}
            onCounterpartyChange={handleCounterpartyChange}
            disabled={isAnchoring || Boolean(anchorResult)}
          />
        </div>
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
