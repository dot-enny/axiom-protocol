"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignatureRow } from "@/components/deal-room/signature-row";
import { requiredSigsLabel, statusLabel } from "@/components/deal-room/deal-labels";
import { truncateMiddle } from "@/lib/format";
import type { Deal } from "@/components/deal-room/deal-room-workspace";

interface ExecutionDetailProps {
  deal: Deal;
  connectedAddress: string | null;
  isExecuting: boolean;
  onBack: () => void;
  onExecute: () => void;
}

interface ButtonState {
  label: string;
  disabled: boolean;
  hint: string | null;
}

function getButtonState(
  deal: Deal,
  connectedAddress: string | null,
  isExecuting: boolean
): ButtonState {
  const dealState = deal.dealState;

  if (deal.queryStatus === "loading") {
    return { label: "Querying...", disabled: true, hint: null };
  }
  if (deal.queryStatus !== "found" || !dealState) {
    return { label: "[ NO ACTION AVAILABLE ]", disabled: true, hint: null };
  }
  if (dealState.executedAt > 0) {
    return { label: "[ ESCROW LOCKED & ANCHORED ]", disabled: true, hint: null };
  }
  if (isExecuting) {
    return { label: "Executing...", disabled: true, hint: null };
  }
  if (!connectedAddress) {
    return { label: "[ CONNECT WALLET TO APPROVE ]", disabled: false, hint: null };
  }
  if (!dealState.signers.includes(connectedAddress)) {
    return {
      label: "[ NOT AN AUTHORIZED SIGNER ]",
      disabled: true,
      hint: "This connected wallet is not one of this deal's authorized signers.",
    };
  }
  if (dealState.approvals.includes(connectedAddress)) {
    return {
      label: "[ ✓ YOU HAVE SIGNED — AWAITING OTHERS ]",
      disabled: true,
      hint: `Awaiting ${dealState.threshold - dealState.approvals.length} more signature(s).`,
    };
  }
  return { label: "Sign & Execute Contract", disabled: false, hint: null };
}

export function ExecutionDetail({
  deal,
  connectedAddress,
  isExecuting,
  onBack,
  onExecute,
}: ExecutionDetailProps) {
  const buttonState = getButtonState(deal, connectedAddress, isExecuting);

  return (
    <div>
      <div className="border-b border-black px-6 py-6 md:px-10">
        <button
          onClick={onBack}
          className="font-mono text-xs uppercase tracking-widest hover:underline"
        >
          {"← Back to Pending Queue"}
        </button>
        <h2 className="mt-3 break-all text-2xl font-black tracking-tight md:text-3xl">
          {truncateMiddle(deal.hash, 10, 8)}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-4">
          <p className="font-mono text-xs uppercase tracking-widest">
            {deal.assetType}
          </p>
          <p className="font-mono text-xs uppercase tracking-widest">
            {`${requiredSigsLabel(deal)} — ${statusLabel(deal)}`}
          </p>
          <Link
            href={{ pathname: "/verify", query: { hash: deal.hash } }}
            className="border border-black px-2 py-1 font-mono text-xs uppercase tracking-widest transition-colors duration-100 hover:bg-black hover:text-white"
          >
            {"[ View Hash ]"}
          </Link>
        </div>
      </div>

      {deal.queryStatus === "found" && deal.dealState && (
        <div>
          {deal.dealState.signers.map((signer, index) => (
            <SignatureRow
              key={signer}
              role={`Signer ${index + 1}${signer === connectedAddress ? " (You)" : ""}`}
              address={signer}
              signed={deal.dealState!.approvals.includes(signer)}
              signedLabel="SIGNED"
            />
          ))}
        </div>
      )}

      {deal.queryStatus === "loading" && (
        <p className="border-b border-black px-6 py-6 font-mono text-xs uppercase tracking-widest md:px-10">
          [NETWORK] Querying on-chain deal state...
        </p>
      )}

      {deal.queryStatus === "not-found" && (
        <p className="border-b border-black px-6 py-6 font-mono text-xs uppercase tracking-widest md:px-10">
          {"[ NO ON-CHAIN DEAL FOUND FOR THIS HASH ]"} — this document was
          recorded locally (issuer {truncateMiddle(deal.issuer, 6, 4)}) but no
          matching propose_deal escrow exists on the currently deployed
          contract.
        </p>
      )}

      {deal.queryStatus === "error" && (
        <p className="border-b border-black px-6 py-6 font-mono text-xs uppercase tracking-widest md:px-10">
          [ERROR] {deal.queryError}
        </p>
      )}

      <div className="border-t border-black px-6 py-10 md:px-10">
        <Button
          onClick={onExecute}
          disabled={buttonState.disabled}
          className="w-full px-6 py-4 text-xs sm:w-auto"
        >
          {buttonState.label}
        </Button>
        {buttonState.hint && (
          <p className="mt-3 font-mono text-xs uppercase tracking-widest">
            {buttonState.hint}
          </p>
        )}
      </div>
    </div>
  );
}
