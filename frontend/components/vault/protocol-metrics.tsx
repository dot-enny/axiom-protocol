"use client";

import { useLedgerStore } from "@/lib/useLedgerStore";
import { calculateAssetValue, formatUsd } from "@/lib/format";

export function ProtocolMetrics() {
  const records = useLedgerStore();

  const totalValueAnchored = records.reduce(
    (sum, record) => sum + calculateAssetValue(record.hash),
    0
  );

  const metrics = [
    { label: "Total Value Anchored", value: formatUsd(totalValueAnchored) },
    { label: "Active Contracts", value: String(records.length) },
    { label: "Network", value: "Soroban Testnet" },
  ];

  return (
    <div className="grid grid-cols-1 divide-y divide-black border-b border-black md:grid-cols-3 md:divide-x md:divide-y-0">
      {metrics.map((metric) => (
        <div key={metric.label} className="px-6 py-10 md:px-10">
          <p className="font-mono text-xs uppercase tracking-widest">
            {metric.label}
          </p>
          <p className="mt-3 font-mono text-3xl font-black tracking-tight md:text-4xl">
            {metric.value}
          </p>
        </div>
      ))}
    </div>
  );
}
