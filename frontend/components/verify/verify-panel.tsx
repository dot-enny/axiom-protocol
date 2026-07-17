"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { AuditTrail } from "@/components/verify/audit-trail";
import { queryVerifyProof, type ComplianceRecord } from "@/lib/soroban";
import { getRecords } from "@/lib/useLedgerStore";

type QueryState = "idle" | "loading" | "found" | "rejected";

const HASH_PATTERN = /^[a-f0-9]{64}$/i;

function findLocalRecord(hash: string): ComplianceRecord | null {
  const local = getRecords().find((r) => r.hash === hash);
  return local ? { issuer: local.issuer, timestampIso: local.timestamp } : null;
}

interface VerifyPanelProps {
  initialHash?: string;
}

export function VerifyPanel({ initialHash }: VerifyPanelProps) {
  const [hashInput, setHashInput] = useState(
    () => initialHash?.trim().toLowerCase() ?? ""
  );
  const [queryState, setQueryState] = useState<QueryState>("idle");
  const [record, setRecord] = useState<ComplianceRecord | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [formatWarning, setFormatWarning] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const hash = hashInput.trim().toLowerCase();

    if (!HASH_PATTERN.test(hash)) {
      setFormatWarning(true);
      return;
    }
    setFormatWarning(false);

    setQueryState("loading");
    setRecord(null);
    setDetail(null);

    try {
      const result = (await queryVerifyProof(hash)) ?? findLocalRecord(hash);
      if (result) {
        setRecord(result);
        setQueryState("found");
      } else {
        setQueryState("rejected");
      }
    } catch (err) {
      const local = findLocalRecord(hash);
      if (local) {
        setRecord(local);
        setQueryState("found");
        return;
      }
      setDetail(err instanceof Error ? err.message : "Unknown error");
      setQueryState("rejected");
    }
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

        {queryState === "found" && record && (
          <div className="rounded-none border-2 border-black bg-black p-6 text-white">
            <p className="font-mono text-2xl font-bold uppercase tracking-tight sm:text-3xl">
              Verified: Anchor Record Found
            </p>
            <div className="mt-6 flex flex-col gap-4 border-t border-white pt-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest">
                  Issuer Wallet Address
                </p>
                <p className="mt-1 break-all font-mono text-sm">
                  {record.issuer}
                </p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest">
                  UTC Timestamp of Anchor
                </p>
                <p className="mt-1 font-mono text-sm">{record.timestampIso}</p>
              </div>
            </div>

            <AuditTrail timestampIso={record.timestampIso} />
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
