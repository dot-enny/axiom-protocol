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
        <div className="flex w-fit border-b-2 border-white">
          <span className="flex items-center bg-white px-3 font-mono text-xs font-bold uppercase tracking-widest text-black">
            04
          </span>
          <h2 className="px-4 py-1 text-3xl font-black tracking-tight md:text-4xl">
            Built for Developers.
          </h2>
        </div>
        <p className="mt-4 max-w-xl text-white">
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
