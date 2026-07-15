import type { Metadata } from "next";
import { Frame } from "@/components/layout/frame";
import { VerifyPanel } from "@/components/verify/verify-panel";

export const metadata: Metadata = {
  title: "Verify — Axiom Protocol",
};

export default function VerifyPage() {
  return (
    <Frame>
      <div className="flex min-h-screen flex-col items-center justify-center border-black px-6 py-24">
        <div className="mb-12 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
            Axiom Protocol
          </p>
          <h1 className="mt-2 font-sans text-3xl font-bold uppercase tracking-tight sm:text-4xl">
            Public Verification Portal
          </h1>
          <p className="mt-4 font-mono text-xs text-slate-500">
            Query the Stellar Testnet ledger directly. No wallet required.
          </p>
        </div>
        <VerifyPanel />
      </div>
    </Frame>
  );
}
