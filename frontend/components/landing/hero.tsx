import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="border-b border-black px-6 py-24 md:px-10 md:py-32">
      <p className="mb-8 font-mono text-xs uppercase tracking-widest text-slate-500">
        Compliance Infrastructure&nbsp;&nbsp;/&nbsp;&nbsp;Stellar Soroban Network
      </p>

      <h1 className="max-w-4xl text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
        Cryptographic Compliance for{" "}
        <span className="inline-block border-2 border-black px-2 py-1">
          Real-World Assets.
        </span>
      </h1>

      <p className="mt-8 max-w-2xl text-lg leading-relaxed text-slate-600 md:text-xl">
        Anchor legal agreements and KYC proofs to tokenized assets on
        Stellar. Zero-knowledge. Immutable. Institutional grade.
      </p>

      <div className="mt-12">
        <Button href="/app" className="px-8 py-4 text-base">
          Launch App
        </Button>
      </div>
    </section>
  );
}
