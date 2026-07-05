"use client";

import { useEffect, useState } from "react";
import { SnapIn } from "@/components/motion/snap-in";
import type { VerificationStatus } from "@/components/dashboard/verification-workspace";

interface TerminalConsoleProps {
  status: VerificationStatus;
  fileName: string | null;
  onSequenceComplete: () => void;
}

const LINE_DELAY_MS = 550;

function buildSequence(fileName: string): string[] {
  const mockHash = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");

  return [
    `[SYSTEM] Isolating ${fileName} in local memory...`,
    "[SYSTEM] No network transmission detected. Privacy preserved.",
    "[CRYPTO] Computing SHA-256 digest...",
    `[CRYPTO] Digest computed: ${mockHash}...`,
    "[SOROBAN] Preparing anchor transaction...",
    "[SOROBAN] Awaiting wallet signature...",
    "[SOROBAN] Proof anchored to ledger.",
  ];
}

export function TerminalConsole({
  status,
  fileName,
  onSequenceComplete,
}: TerminalConsoleProps) {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (status !== "processing" || !fileName) return;

    const sequence = buildSequence(fileName);
    setLines([]);

    const lineTimers = sequence.map((line, i) =>
      setTimeout(() => {
        setLines((prev) => [...prev, line]);
      }, (i + 1) * LINE_DELAY_MS)
    );

    const completeTimer = setTimeout(
      onSequenceComplete,
      (sequence.length + 1) * LINE_DELAY_MS
    );

    return () => {
      lineTimers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [status, fileName, onSequenceComplete]);

  return (
    <div className="flex min-h-[420px] flex-col border border-black bg-black font-mono text-sm text-white">
      <div className="flex items-center gap-2 border-b border-white/20 px-4 py-3">
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="ml-2 text-xs uppercase tracking-widest text-slate-400">
          verification.log
        </span>
      </div>

      <div className="flex-1 space-y-2 p-6">
        {lines.length === 0 && (
          <p className="text-slate-500">{"// awaiting input"}</p>
        )}
        {lines.map((line, i) => (
          <SnapIn key={i}>
            <p className="text-slate-300">
              <span className="text-white">{"> "}</span>
              {line}
            </p>
          </SnapIn>
        ))}
      </div>
    </div>
  );
}
