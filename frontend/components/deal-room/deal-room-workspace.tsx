"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLedgerStore, type AnchorRecord } from "@/lib/useLedgerStore";
import { useWallet } from "@/components/dashboard/wallet-context";
import { WalletModal } from "@/components/WalletModal";
import { useDealStates, type DealQueryEntry, type DealQueryStatus } from "@/lib/useDealStates";
import { PendingQueue } from "@/components/deal-room/pending-queue";
import { ExecutionDetail } from "@/components/deal-room/execution-detail";
import { ExecutionLog } from "@/components/deal-room/execution-log";
import {
  buildApproveDealTransaction,
  buildExecuteDealTransaction,
  queryDealState,
  signAndSubmit,
  translateContractError,
  type DealState,
} from "@/lib/soroban";

export interface Deal {
  id: string;
  hash: string;
  assetType: string;
  /** Real AnchorRecord.issuer — used only as fallback context in the
   *  loading/error/not-found panels, never as a stand-in for real signers. */
  issuer: string;
  queryStatus: DealQueryStatus;
  dealState: DealState | null;
  queryError: string | null;
}

type View = "queue" | "detail";

function toDeal(record: AnchorRecord, entry: DealQueryEntry | undefined): Deal {
  return {
    id: record.id,
    hash: record.hash,
    assetType: "RWA Compliance Anchor",
    issuer: record.issuer,
    queryStatus: entry?.status ?? "loading",
    dealState: entry?.dealState ?? null,
    queryError: entry?.error ?? null,
  };
}

export function DealRoomWorkspace() {
  const records = useLedgerStore();
  const { address } = useWallet();
  const hashes = useMemo(() => records.map((r) => r.hash), [records]);
  const { entries, refresh } = useDealStates(hashes);

  const [view, setView] = useState<View>("queue");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  // Set when "Sign & Execute Contract" is clicked with no wallet
  // connected yet, so approval resumes automatically once the modal's
  // connect succeeds, mirroring the Verify Portal's pendingApprove
  // pattern and the dashboard's pendingAnchor pattern.
  const [pendingApproveHash, setPendingApproveHash] = useState<string | null>(null);

  const deals: Deal[] = useMemo(
    () => records.map((record) => toDeal(record, entries.get(record.hash))),
    [records, entries]
  );
  const selectedDeal = deals.find((deal) => deal.id === selectedId) ?? null;

  const handleSelect = useCallback(
    (dealId: string) => {
      setSelectedId(dealId);
      setTerminalLines([]);
      setView("detail");
      const deal = deals.find((d) => d.id === dealId);
      if (deal) void refresh(deal.hash); // catch changes made elsewhere (Verify Portal, another tab)
    },
    [deals, refresh]
  );

  const handleBack = useCallback(() => setView("queue"), []);

  const runApprove = useCallback(
    async (hash: string, signerAddress: string) => {
      setIsExecuting(true);
      setTerminalLines((prev) => [
        ...prev,
        "[NETWORK] Requesting Freighter signature for approval...",
      ]);

      try {
        const approveUnsigned = await buildApproveDealTransaction(signerAddress, hash);
        await signAndSubmit(approveUnsigned, signerAddress);

        const updated = await queryDealState(hash);
        let executedNow = false;
        if (updated && updated.executedAt === 0 && updated.approvals.length >= updated.threshold) {
          setTerminalLines((prev) => [
            ...prev,
            "[NETWORK] Threshold met — requesting Freighter signature for execution...",
          ]);
          const executeUnsigned = await buildExecuteDealTransaction(signerAddress, hash);
          await signAndSubmit(executeUnsigned, signerAddress);
          executedNow = true;
        }

        // Refresh before announcing success — a refresh that resets
        // query state must never be allowed to run after (and wipe) a
        // success message, the same ordering bug fixed in the Verify
        // Portal's approve flow.
        await refresh(hash);
        setTerminalLines((prev) => [
          ...prev,
          executedNow
            ? "[SOROBAN] Escrow locked. Anchor confirmed."
            : "[SOROBAN] Approval recorded. Awaiting further signatures.",
        ]);
      } catch (err) {
        const translated = translateContractError(err);
        setTerminalLines((prev) => [
          ...prev,
          translated ?? `[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`,
        ]);
      } finally {
        setIsExecuting(false);
      }
    },
    [refresh]
  );

  function handleExecute() {
    if (!selectedDeal || isExecuting) return;
    const hash = selectedDeal.hash;

    if (!address) {
      setPendingApproveHash(hash);
      setIsWalletModalOpen(true);
      return;
    }

    void runApprove(hash, address);
  }

  // The wallet modal closes itself on a successful connection — once
  // that happens, resume the approval the user actually asked for.
  useEffect(() => {
    if (!pendingApproveHash || !address) return;
    const hash = pendingApproveHash;
    setPendingApproveHash(null);
    void runApprove(hash, address);
  }, [pendingApproveHash, address, runApprove]);

  return (
    <div className="border-b border-black">
      {view === "queue" && <PendingQueue deals={deals} onSelect={handleSelect} />}
      {view === "detail" && selectedDeal && (
        <>
          <ExecutionDetail
            deal={selectedDeal}
            connectedAddress={address}
            isExecuting={isExecuting}
            onBack={handleBack}
            onExecute={handleExecute}
          />
          <ExecutionLog lines={terminalLines} />
        </>
      )}

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false);
          if (!address) setPendingApproveHash(null);
        }}
      />
    </div>
  );
}
