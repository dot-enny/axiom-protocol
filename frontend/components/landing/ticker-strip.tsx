import { SnapIn } from "@/components/motion/snap-in";

const SPECS = [
  "SHA-256 CLIENT HASHING",
  "SOROBAN SMART CONTRACTS",
  "STELLAR CONSENSUS PROTOCOL",
  "ZERO RAW FILE UPLOAD",
];

export function TickerStrip() {
  return (
    <div className="flex flex-col divide-y divide-black border-b border-black md:flex-row md:divide-x md:divide-y-0">
      {SPECS.map((spec, i) => (
        <div
          key={spec}
          className="flex-1 px-6 py-4 font-mono text-[11px] uppercase tracking-widest text-slate-500"
        >
          <SnapIn delay={i * 0.04}>{spec}</SnapIn>
        </div>
      ))}
    </div>
  );
}
