"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AuditTrail } from "@/components/verify/audit-trail";
import { useWallet } from "@/components/dashboard/wallet-context";
import { queryDealState, type DealState } from "@/lib/soroban";
import { getRecords } from "@/lib/useLedgerStore";

type QueryState = "idle" | "loading" | "found" | "rejected";

const HASH_PATTERN = /^[a-f0-9]{64}$/i;

// Best-effort degrade path for when the chain read itself fails
// (network error) — the local ledger only ever knows about deals this
// browser proposed, and doesn't track approvals/execution, so this is
// necessarily an approximation: it reports the deal as still pending
// with no approvals recorded, never as executed.
function findLocalRecord(hash: string): DealState | null {
  const local = getRecords().find((r) => r.hash === hash);
  if (!local) return null;
  return {
    signers: [local.issuer],
    approvals: [],
    threshold: local.threshold,
    executedAt: 0,
  };
}

export function VerifyPanel() {
  const searchParams = useSearchParams();
  const { address } = useWallet();
  const [hashInput, setHashInput] = useState("");
  const [queryState, setQueryState] = useState<QueryState>("idle");
  const [dealState, setDealState] = useState<DealState | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [formatWarning, setFormatWarning] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approveMessage, setApproveMessage] = useState<string | null>(null);
  const hasAutoRun = useRef(false);
  const lastQueriedHash = useRef<string | null>(null);

  async function handleVerify(rawHash: string) {
    const hash = rawHash.trim().toLowerCase();

    if (!HASH_PATTERN.test(hash)) {
      setFormatWarning(true);
      return;
    }
    setFormatWarning(false);

    setQueryState("loading");
    setDealState(null);
    setDetail(null);
    setApproveMessage(null);
    lastQueriedHash.current = hash;

    try {
      const result = (await queryDealState(hash)) ?? findLocalRecord(hash);
      if (result) {
        setDealState(result);
        setQueryState("found");
      } else {
        setQueryState("rejected");
      }
    } catch (err) {
      const local = findLocalRecord(hash);
      if (local) {
        setDealState(local);
        setQueryState("found");
        return;
      }
      setDetail(err instanceof Error ? err.message : "Unknown error");
      setQueryState("rejected");
    }
  }

  async function handleApprove() {
    const hash = lastQueriedHash.current;
    if (!hash) return;

    const signerAddress =
      address ?? window.prompt("Enter your Stellar wallet address to approve this deal:");
    if (!signerAddress) return;

    setIsApproving(true);
    setApproveMessage(null);

    try {
      const response = await fetch("/api/v1/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash, signerAddress }),
      });
      const body: unknown = await response.json().catch(() => undefined);

      if (!response.ok) {
        const message =
          body && typeof body === "object" && "error" in body
            ? String((body as { error: unknown }).error)
            : `Request failed with status ${response.status}`;
        setApproveMessage(`[ERROR] ${message}`);
        return;
      }

      setApproveMessage(
        (body as { executed?: boolean }).executed
          ? "[SOROBAN] Approval recorded — threshold met, deal executed."
          : "[SOROBAN] Approval recorded. Awaiting further signatures."
      );
      await handleVerify(hash);
    } catch (err) {
      setApproveMessage(
        `[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsApproving(false);
    }
  }

  // Deep-link support: ?hash=... populates and auto-queries on first mount only,
  // so it doesn't re-fire if the user edits the input afterward.
  useEffect(() => {
    if (hasAutoRun.current) return;
    const urlHash = searchParams.get("hash");
    if (!urlHash) return;
    hasAutoRun.current = true;
    const normalized = urlHash.trim().toLowerCase();
    setHashInput(normalized);
    void handleVerify(normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void handleVerify(hashInput);
  }

  const isLoading = queryState === "loading";

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label
          htmlFor="hash"
          className="font-mono text-xs uppercase tracking-widest"
        >
          Document Hash (SHA-256)
        </label>
        <input
          id="hash"
          value={hashInput}
          onChange={(e) => {
            setHashInput(e.target.value);
            setFormatWarning(false);
          }}
          placeholder="0000000000000000000000000000000000000000000000000000000000000000"
          spellCheck={false}
          autoComplete="off"
          className="rounded-none border-2 border-black bg-white px-4 py-4 font-mono text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-0"
        />
        {formatWarning && (
          <p className="font-mono text-xs uppercase tracking-widest text-black">
            Expected a 64-character hexadecimal SHA-256 hash.
          </p>
        )}

        <Button type="submit" disabled={isLoading} className="px-6 py-4 text-xs">
          {isLoading ? "Querying..." : "Query Ledger State"}
        </Button>
      </form>

      <div className="mt-8">
        {queryState === "loading" && (
          <p className="font-mono text-xs uppercase tracking-widest">
            [NETWORK] Scanning blocks...
          </p>
        )}

        {queryState === "found" && dealState && dealState.executedAt > 0 && (
          <div className="rounded-none border-2 border-black bg-black p-6 text-white">
            <p className="font-mono text-2xl font-bold uppercase tracking-tight sm:text-3xl">
              {"[ VERIFIED & EXECUTED ]"}
            </p>
            <div className="mt-6 flex flex-col gap-4 border-t border-white pt-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest">
                  Authorized Signers ({dealState.signers.length})
                </p>
                <ul className="mt-1 flex flex-col gap-1">
                  {dealState.signers.map((signer) => (
                    <li key={signer} className="break-all font-mono text-sm">
                      {signer}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest">
                  UTC Timestamp of Execution
                </p>
                <p className="mt-1 font-mono text-sm">
                  {new Date(dealState.executedAt * 1000).toISOString()}
                </p>
              </div>
            </div>

            <AuditTrail
              timestampIso={new Date(dealState.executedAt * 1000).toISOString()}
            />
          </div>
        )}

        {queryState === "found" && dealState && dealState.executedAt === 0 && (
          <div className="rounded-none border-4 border-black bg-white p-6 text-black">
            <p className="font-mono text-2xl font-bold uppercase tracking-tight sm:text-3xl">
              {`[ PENDING ESCROW: ${dealState.approvals.length} / ${dealState.threshold} SIGNATURES ]`}
            </p>
            <div className="mt-6 border-t-2 border-black pt-6">
              <p className="font-mono text-xs uppercase tracking-widest">
                Authorized Signers
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {dealState.signers.map((signer) => (
                  <li key={signer} className="font-mono text-sm">
                    <span className="mr-2 font-bold">
                      {dealState.approvals.includes(signer) ? "[X]" : "[ ]"}
                    </span>
                    <span className="break-all">{signer}</span>
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={handleApprove}
              disabled={isApproving}
              className="mt-6 w-full py-5 text-sm"
            >
              {isApproving ? "Submitting Approval..." : "[ APPROVE DEAL ]"}
            </Button>

            {approveMessage && (
              <p className="mt-4 font-mono text-xs uppercase tracking-widest">
                {approveMessage}
              </p>
            )}
          </div>
        )}

        {queryState === "rejected" && (
          <div className="rounded-none border-2 border-black p-6">
            <p className="font-mono text-2xl font-bold uppercase tracking-tight sm:text-3xl">
              Rejected: No Match On Ledger
            </p>
            {detail && (
              <p className="mt-4 font-mono text-xs">
                [ERROR] {detail}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
