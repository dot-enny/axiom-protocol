import { FeatureCard } from "@/components/landing/feature-card";
import { SnapIn } from "@/components/motion/snap-in";

const FEATURES = [
  {
    index: "01",
    title: "Client-Side Hashing",
    description:
      "Documents are hashed with SHA-256 directly in the browser. Raw files are never uploaded, transmitted, or stored — privacy is preserved by construction.",
  },
  {
    index: "02",
    title: "Soroban Escrow",
    description:
      "The resulting proof is anchored to a Soroban smart contract on Stellar — timestamped, immutable, and publicly verifiable on the ledger.",
  },
  {
    index: "03",
    title: "RWA Binding",
    description:
      "Anchored proofs are bound to the on-chain identifier of the tokenized asset, linking legal reality directly to ledger state.",
  },
];

export function FeaturesSection() {
  return (
    <section id="how-it-works" className="border-b border-black">
      <div className="border-b border-black px-6 py-10 md:px-10">
        <SnapIn>
          <div className="flex w-fit border-b-2 border-black">
            <span className="flex items-center bg-black px-3 font-mono text-xs font-bold uppercase tracking-widest text-white">
              01
            </span>
            <h2 className="px-4 py-1 text-3xl font-black tracking-tight md:text-4xl">
              How It Works
            </h2>
          </div>
        </SnapIn>
      </div>

      <div className="flex flex-col divide-y divide-black md:flex-row md:divide-x md:divide-y-0">
        {FEATURES.map((feature, i) => (
          <FeatureCard key={feature.index} {...feature} delay={i * 0.06} />
        ))}
      </div>
    </section>
  );
}
