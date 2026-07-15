import type { Metadata } from "next";
import { VerificationWorkspace } from "@/components/dashboard/verification-workspace";
import { VerificationLedger } from "@/components/dashboard/verification-ledger";

export const metadata: Metadata = {
  title: "Dashboard — Axiom Protocol",
};

export default function DashboardPage() {
  return (
    <>
      <VerificationWorkspace />
      <VerificationLedger />
    </>
  );
}
