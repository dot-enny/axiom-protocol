import { MetricItem } from "@/components/landing/metric-item";
import { SnapIn } from "@/components/motion/snap-in";

const METRICS = [
  {
    value: "< 5s",
    label: "Network Finality",
    subtext: "Stellar Consensus Protocol",
  },
  {
    value: "< $0.001",
    label: "Storage Rent",
    subtext: "Soroban Persistent State",
  },
  {
    value: "Zero-Knowledge",
    label: "Privacy",
    subtext: "Client-Side Hashing",
  },
];

export function NetworkMetrics() {
  return (
    <section className="border-b border-black">
      <div className="border-b border-black px-6 py-10 md:px-10">
        <SnapIn>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
            {"// 02"}
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            Network Metrics
          </h2>
        </SnapIn>
      </div>

      <div className="flex flex-col md:flex-row">
        {METRICS.map((metric, i) => (
          <MetricItem key={metric.label} {...metric} index={i} />
        ))}
      </div>
    </section>
  );
}
