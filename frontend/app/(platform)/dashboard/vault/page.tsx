import type { Metadata } from "next";
import { ProtocolMetrics } from "@/components/vault/protocol-metrics";
import { AssetLedger } from "@/components/vault/asset-ledger";

export const metadata: Metadata = {
  title: "Asset Vault — Axiom Protocol",
};

export default function VaultPage() {
  return (
    <div>
      <div className="border-b border-black px-6 py-10 md:px-10">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
          {"// Tokenized Vault"}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
          Asset Vault
        </h1>
      </div>
      <ProtocolMetrics />
      <AssetLedger />
    </div>
  );
}
