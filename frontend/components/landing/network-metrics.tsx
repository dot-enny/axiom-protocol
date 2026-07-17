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
          <div className="flex w-fit border-b-2 border-black">
            <span className="flex items-center bg-black px-3 font-mono text-xs font-bold uppercase tracking-widest text-white">
              02
            </span>
            <h2 className="px-4 py-1 text-3xl font-black tracking-tight md:text-4xl">
              Network Metrics
            </h2>
          </div>
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
