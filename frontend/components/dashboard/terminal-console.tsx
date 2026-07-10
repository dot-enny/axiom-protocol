"use client";

import { useEffect, useState } from "react";
import { SnapIn } from "@/components/motion/snap-in";
import type {
  VerificationStatus,
  VerifiedFile,
} from "@/components/dashboard/verification-workspace";

interface TerminalConsoleProps {
  status: VerificationStatus;
  file: VerifiedFile | null;
  onSequenceComplete: () => void;
  extraLines: string[];
}

const LINE_DELAY_MS = 550;

function buildSequence(file: VerifiedFile): string[] {
  return [
    `[SYSTEM] Intercepting local file: ${file.name} (${file.size.toLocaleString()} bytes)...`,
    "[CRYPTO] Computing SHA-256 hash in browser sandbox...",
    `[CRYPTO] Hash generated: ${file.hash}`,
    "[NETWORK] Ready for Soroban anchor.",
  ];
}

export function TerminalConsole({
  status,
  file,
  onSequenceComplete,
  extraLines,
}: TerminalConsoleProps) {
  const [lines, setLines] = useState<string[]>([]);

  useEffect(() => {
    if (status !== "processing" || !file) return;

    const sequence = buildSequence(file);
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
  }, [status, file, onSequenceComplete]);

  const allLines = [...lines, ...extraLines];

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
        {allLines.length === 0 && (
          <p className="text-slate-500">{"// awaiting input"}</p>
        )}
        {allLines.map((line, i) => (
          <SnapIn key={i}>
            <p className="break-all text-slate-300">
              <span className="text-white">{"> "}</span>
              {line}
            </p>
          </SnapIn>
        ))}
      </div>
    </div>
  );
}
