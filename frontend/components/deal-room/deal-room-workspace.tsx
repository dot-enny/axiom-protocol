"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/components/dashboard/wallet-context";
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

const MOCK_DEAL: Omit<Deal, "requiredSigs" | "status"> = {
  id: "deal-1",
  hash: "a7f3b9c1d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6",
  assetType: "Commercial Real Estate",
  issuer: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
  auditor: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
};

const EXECUTE_DELAY_MS = 1200;

export function DealRoomWorkspace() {
  const [view, setView] = useState<View>("queue");
  const [counterpartySigned, setCounterpartySigned] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);
  const { address } = useWallet();

  const deal: Deal = {
    ...MOCK_DEAL,
    requiredSigs: counterpartySigned ? "3/3" : "2/3",
    status: counterpartySigned ? "Escrow Locked & Anchored" : "Action Required",
  };

  const handleSelect = useCallback(() => setView("detail"), []);
  const handleBack = useCallback(() => setView("queue"), []);

  function handleExecute() {
    if (counterpartySigned || isExecuting) return;

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
      setCounterpartySigned(true);
      setIsExecuting(false);
    }, EXECUTE_DELAY_MS);
  }

  return (
    <div className="border-b border-black">
      {view === "queue" && (
        <PendingQueue deals={[deal]} onSelect={handleSelect} />
      )}
      {view === "detail" && (
        <>
          <ExecutionDetail
            deal={deal}
            counterpartyAddress={address ?? "Not connected"}
            counterpartySigned={counterpartySigned}
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
