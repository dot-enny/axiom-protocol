"use client";

import { useCallback, useMemo, useState } from "react";
import { useWallet } from "@/components/dashboard/wallet-context";
import { useLedgerStore } from "@/lib/useLedgerStore";
import { PendingQueue } from "@/components/deal-room/pending-queue";
import { ExecutionDetail } from "@/components/deal-room/execution-detail";
import { ExecutionLog } from "@/components/deal-room/execution-log";

export interface Deal {
  id: string;
  hash: string;
  assetType: string;
  issuer: string;
  auditor: string;
  requiredSigs: string;
  status: string;
}

type View = "queue" | "detail";

// No real auditor/counterparty-review system exists yet — every real
// anchor is treated as a deal awaiting multi-sig execution, with a
// fixed mock auditor, per this session's task spec.
const MOCK_AUDITOR = "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ";
const EXECUTE_DELAY_MS = 1200;

export function DealRoomWorkspace() {
  const [view, setView] = useState<View>("queue");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [signedIds, setSignedIds] = useState<Set<string>>(new Set());
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const { address } = useWallet();
  const records = useLedgerStore();

  const deals: Deal[] = useMemo(
    () =>
      records.map((record) => {
        const signed = signedIds.has(record.id);
        return {
          id: record.id,
          hash: record.hash,
          assetType: "RWA Compliance Anchor",
          issuer: record.issuer,
          auditor: MOCK_AUDITOR,
          requiredSigs: signed ? "3/3" : "2/3",
          status: signed ? "Escrow Locked & Anchored" : "Action Required",
        };
      }),
    [records, signedIds]
  );

  const selectedDeal = deals.find((deal) => deal.id === selectedId) ?? null;

  const handleSelect = useCallback((dealId: string) => {
    setSelectedId(dealId);
    setTerminalLines([]);
    setView("detail");
  }, []);

  const handleBack = useCallback(() => setView("queue"), []);

  function handleExecute() {
    if (!selectedDeal || signedIds.has(selectedDeal.id) || isExecuting) return;

    const dealId = selectedDeal.id;
    setIsExecuting(true);
    setTerminalLines((prev) => [
      ...prev,
      "[NETWORK] Requesting multi-sig Freighter execution...",
    ]);

    setTimeout(() => {
      setTerminalLines((prev) => [
        ...prev,
        "[SOROBAN] Escrow locked. Anchor confirmed.",
      ]);
      setSignedIds((prev) => new Set(prev).add(dealId));
      setIsExecuting(false);
    }, EXECUTE_DELAY_MS);
  }

  return (
    <div className="border-b border-black">
      {view === "queue" && <PendingQueue deals={deals} onSelect={handleSelect} />}
      {view === "detail" && selectedDeal && (
        <>
          <ExecutionDetail
            deal={selectedDeal}
            counterpartyAddress={address ?? "Not connected"}
            counterpartySigned={signedIds.has(selectedDeal.id)}
            isExecuting={isExecuting}
            onBack={handleBack}
            onExecute={handleExecute}
          />
          <ExecutionLog lines={terminalLines} />
        </>
      )}
    </div>
  );
}
