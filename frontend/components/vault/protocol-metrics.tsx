interface Metric {
  label: string;
  value: string;
}

const METRICS: Metric[] = [
  { label: "Total Value Anchored", value: "$142,500,000" },
  { label: "Active Contracts", value: "34" },
  { label: "Network", value: "Soroban Testnet" },
];

export function ProtocolMetrics() {
  return (
    <div className="grid grid-cols-1 divide-y divide-black border-b border-black md:grid-cols-3 md:divide-x md:divide-y-0">
      {METRICS.map((metric) => (
        <div key={metric.label} className="px-6 py-10 md:px-10">
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
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
