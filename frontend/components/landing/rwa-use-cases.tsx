import { UseCaseCard } from "@/components/landing/use-case-card";
import { SnapIn } from "@/components/motion/snap-in";

const USE_CASES = [
  {
    title: "Real Estate Tokenization",
    description: "Cryptographically bind property deeds to tokens.",
  },
  {
    title: "Private Credit",
    description: "Hash borrower KYC and loan agreements on-chain.",
  },
  {
    title: "Treasury Bills",
    description: "Immutable proof of regulatory compliance.",
  },
  {
    title: "Supply Chain",
    description: "Anchor auditor reports to specific shipments.",
  },
];

// Position in a 2x2 grid determines which edges carry a divider line.
// Index 0 (top-left) has none; the rest are keyed to their row/column.
const DIVIDER_EDGES = [
  "",
  "border-t sm:border-t-0 sm:border-l",
  "border-t",
  "border-t sm:border-l",
];

export function RwaUseCases() {
  return (
    <section className="border-b border-black">
      <div className="border-b border-black px-6 py-10 md:px-10">
        <SnapIn>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
            {"// 03"}
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            RWA Use Cases
          </h2>
        </SnapIn>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2">
        {USE_CASES.map((useCase, i) => (
          <UseCaseCard
            key={useCase.title}
            {...useCase}
            dividerEdges={DIVIDER_EDGES[i]}
            delay={i * 0.06}
          />
        ))}
      </div>
    </section>
  );
}
