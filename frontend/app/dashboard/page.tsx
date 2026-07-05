import type { Metadata } from "next";
import { Frame } from "@/components/layout/frame";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { VerificationWorkspace } from "@/components/dashboard/verification-workspace";
import { VerificationLedger } from "@/components/dashboard/verification-ledger";

export const metadata: Metadata = {
  title: "Dashboard — Axiom Protocol",
};

export default function DashboardPage() {
  return (
    <Frame>
      <div className="flex min-h-screen flex-col md:flex-row">
        <DashboardSidebar />
        <main className="flex-1">
          <VerificationWorkspace />
          <VerificationLedger />
        </main>
      </div>
    </Frame>
  );
}
