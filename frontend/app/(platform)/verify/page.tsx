import type { Metadata } from "next";
import { VerifyPanel } from "@/components/verify/verify-panel";

export const metadata: Metadata = {
  title: "Verify — Axiom Protocol",
};

interface VerifyPageProps {
  searchParams: { hash?: string };
}

export default function VerifyPage({ searchParams }: VerifyPageProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-24">
      <div className="mb-12 text-center">
        <p className="font-mono text-xs uppercase tracking-widest">
          Axiom Protocol
        </p>
        <h1 className="mt-2 text-3xl font-bold uppercase tracking-tight sm:text-4xl">
          Public Verification Portal
        </h1>
        <p className="mt-4 font-mono text-xs uppercase tracking-widest">
          Query the Stellar Testnet ledger directly. No wallet required.
        </p>
      </div>
      <VerifyPanel initialHash={searchParams.hash} />
    </div>
  );
}
