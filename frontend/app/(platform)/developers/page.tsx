import type { Metadata } from "next";
import { ApiCredentials } from "@/components/developers/api-credentials";
import { ApiDocs } from "@/components/developers/api-docs";
import { InfrastructureStatus } from "@/components/developers/infrastructure-status";

export const metadata: Metadata = {
  title: "Developer API — Axiom Protocol",
};

export default function DevelopersPage() {
  return (
    <div className="divide-y divide-black border-b border-black">
      <ApiCredentials />
      <ApiDocs />
      <InfrastructureStatus />
    </div>
  );
}
