import type { Metadata } from "next";
import { DealRoomWorkspace } from "@/components/deal-room/deal-room-workspace";

export const metadata: Metadata = {
  title: "Deal Room — Axiom Protocol",
};

export default function DealRoomPage() {
  return (
    <div>
      <div className="border-b border-black px-6 py-10 md:px-10">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
          {"// Deal Room"}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
          Multi-Signature Execution
        </h1>
      </div>
      <DealRoomWorkspace />
    </div>
  );
}
