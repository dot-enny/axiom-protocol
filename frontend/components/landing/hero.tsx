import { Button } from "@/components/ui/button";
import { SnapIn } from "@/components/motion/snap-in";

export function Hero() {
  return (
    <section className="border-b border-black px-6 py-24 md:px-10 md:py-32">
      <SnapIn>
        <p className="mb-8 font-mono text-xs uppercase tracking-widest">
          Compliance Infrastructure&nbsp;&nbsp;/&nbsp;&nbsp;Stellar Soroban Network
        </p>
      </SnapIn>

      <SnapIn delay={0.06}>
        <h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
          Cryptographic Compliance for{" "}
          <span className="inline-block rounded-none border-2 border-black px-2 py-1">
            Real-World Assets.
          </span>
        </h1>
      </SnapIn>

      <SnapIn delay={0.12}>
        <p className="mt-8 max-w-2xl text-lg leading-relaxed md:text-xl">
          Anchor legal agreements and KYC proofs to tokenized assets on
          Stellar. Zero-knowledge. Immutable. Institutional grade.
        </p>
      </SnapIn>

      <SnapIn delay={0.18} className="mt-12">
        <Button href="/dashboard" className="px-8 py-4 text-base">
          Launch App
        </Button>
      </SnapIn>
    </section>
  );
}
