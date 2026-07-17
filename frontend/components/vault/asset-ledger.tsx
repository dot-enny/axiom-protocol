"use client";

import Link from "next/link";
import { useLedgerStore } from "@/lib/useLedgerStore";
import { calculateAssetValue, formatUsd } from "@/lib/format";

// No real token ID exists per anchor yet, so it's deterministically
// derived from the real hash — same hash always produces the same
// token ID, rather than being random on every render.
function deriveTokenId(hash: string): string {
  return `TKN-${hash.slice(0, 8).toUpperCase()}`;
}

export function AssetLedger() {
  const records = useLedgerStore();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse whitespace-nowrap font-mono text-sm">
        <thead className="border-b border-black">
          <tr className="text-left">
            <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest md:px-10">
              Asset Name
            </th>
            <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest">
              Token ID
            </th>
            <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest">
              TVL
            </th>
            <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest">
              Compliance Proof
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black">
          {records.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className="px-6 py-6 font-mono text-xs uppercase tracking-widest md:px-10"
              >
                {"[ NO TOKENIZED ASSETS FOUND. ANCHOR A DOCUMENT TO BEGIN. ]"}
              </td>
            </tr>
          ) : (
            records.map((record) => (
              <tr key={record.id}>
                <td className="px-6 py-4 md:px-10">{record.filename}</td>
                <td className="px-6 py-4">{deriveTokenId(record.hash)}</td>
                <td className="px-6 py-4">{formatUsd(calculateAssetValue(record.hash))}</td>
                <td className="px-6 py-4">
                  <Link
                    href={{ pathname: "/verify", query: { hash: record.hash } }}
                    className="border border-black px-2 py-1 text-xs uppercase tracking-widest transition-colors duration-100 hover:bg-black hover:text-white"
                  >
                    {"[ View Hash ]"}
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
