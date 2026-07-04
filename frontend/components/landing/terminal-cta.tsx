import { SnapIn } from "@/components/motion/snap-in";
import { Typewriter } from "@/components/motion/typewriter";
import { TerminalWindow } from "@/components/ui/terminal-window";

const SNIPPET = [
  "import { verify } from '@axiom/sdk';",
  "const proof = await verify(documentHash);",
  "console.log(proof.status); // 'ANCHORED'",
].join("\n");

export function TerminalCta() {
  return (
    <section className="bg-black px-6 py-24 text-white md:px-10 md:py-32">
      <SnapIn>
        <p className="font-mono text-xs uppercase tracking-widest text-slate-400">
          {"// 04"}
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
          Built for Developers.
        </h2>
        <p className="mt-4 max-w-xl text-slate-400">
          One SDK call to verify a document&rsquo;s cryptographic proof
          against its on-chain anchor.
        </p>
      </SnapIn>

      <SnapIn delay={0.1} className="mt-10 max-w-2xl">
        <TerminalWindow>
          <Typewriter
            text={SNIPPET}
            className="font-mono text-sm leading-relaxed text-white md:text-base"
          />
        </TerminalWindow>
      </SnapIn>
    </section>
  );
}
