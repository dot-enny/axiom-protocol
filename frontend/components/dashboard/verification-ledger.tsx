"use client";

import { LedgerRow } from "@/components/dashboard/ledger-row";
import { SnapIn } from "@/components/motion/snap-in";
import { formatTimestamp } from "@/lib/format";
import { useLedgerStore } from "@/lib/useLedgerStore";

export function VerificationLedger() {
  const records = useLedgerStore();

  return (
    <section>
      <div className="border-b border-black px-6 py-10 md:px-10">
        <SnapIn>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
            {"// Ledger"}
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            Recent Anchors
          </h2>
        </SnapIn>
      </div>

      <div className="overflow-x-auto border-b border-black">
        <table className="w-full min-w-[720px] border-collapse font-mono text-sm">
          <thead className="border-b border-black">
            <tr className="text-left">
              <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500 md:px-10">
                Document Hash
              </th>
              <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500">
                Timestamp
              </th>
              <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500">
                Issuer Address
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {records.length === 0 ? (
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-6 font-mono text-xs uppercase tracking-widest text-slate-500 md:px-10"
                >
                  {"[ NO LOCAL RECORDS FOUND. AWAITING INPUT. ]"}
                </td>
              </tr>
            ) : (
              records.map((record, i) => (
                <LedgerRow
                  key={record.id}
                  hash={record.hash}
                  timestamp={formatTimestamp(record.timestamp)}
                  issuer={record.issuer}
                  delay={i * 0.04}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
