"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignatureRow } from "@/components/deal-room/signature-row";
import { truncateMiddle } from "@/lib/format";
import type { Deal } from "@/components/deal-room/deal-room-workspace";

interface ExecutionDetailProps {
  deal: Deal;
  counterpartySigned: boolean;
  isExecuting: boolean;
  onBack: () => void;
  onExecute: () => void;
}

export function ExecutionDetail({
  deal,
  counterpartySigned,
  isExecuting,
  onBack,
  onExecute,
}: ExecutionDetailProps) {
  return (
    <div>
      <div className="border-b border-black px-6 py-6 md:px-10">
        <button
          onClick={onBack}
          className="font-mono text-xs uppercase tracking-widest text-slate-500 transition-colors duration-100 hover:text-black"
        >
          {"← Back to Pending Queue"}
        </button>
        <h2 className="mt-3 break-all text-2xl font-black tracking-tight md:text-3xl">
          {truncateMiddle(deal.hash, 10, 8)}
        </h2>
        <div className="mt-2 flex items-center gap-4">
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
            {deal.assetType}
          </p>
          <Link
            href={{ pathname: "/verify", query: { hash: deal.hash } }}
            className="border border-black px-2 py-1 font-mono text-xs uppercase tracking-widest transition-colors duration-100 hover:bg-black hover:text-white"
          >
            {"[ View Hash ]"}
          </Link>
        </div>
      </div>

      <div>
        <SignatureRow
          role="Party 1 (Issuer)"
          address={deal.issuer}
          signed
          signedLabel="SIGNED"
        />
        <SignatureRow
          role="Party 2 (Auditor)"
          address={deal.auditor}
          signed
          signedLabel="VERIFIED"
        />
        <SignatureRow
          role="Party 3 (Counterparty)"
          address={deal.counterparty}
          signed={counterpartySigned}
          signedLabel="SIGNED"
        />
      </div>

      <div className="border-t border-black px-6 py-10 md:px-10">
        <Button
          onClick={onExecute}
          disabled={counterpartySigned || isExecuting}
          className="w-full px-6 py-4 text-xs sm:w-auto"
        >
          {counterpartySigned
            ? "[ ESCROW LOCKED & ANCHORED ]"
            : isExecuting
              ? "Executing..."
              : "Sign & Execute Contract"}
        </Button>
      </div>
    </div>
  );
}
