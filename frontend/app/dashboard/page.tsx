import type { Metadata } from "next";
import { Frame } from "@/components/layout/frame";
import { DashboardSidebar } from "@/components/dashboard/sidebar";

export const metadata: Metadata = {
  title: "Dashboard — Axiom Protocol",
};

export default function DashboardPage() {
  return (
    <Frame>
      <div className="flex min-h-screen flex-col md:flex-row">
        <DashboardSidebar />
        <main className="flex-1" />
      </div>
    </Frame>
  );
}
