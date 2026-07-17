"use client";

import { useEffect, useRef, useState } from "react";
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
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "processing" || !file) return;

    const sequence = buildSequence(file);
    setLines([]);

    const lineTimers = sequence.map((line, i) =>
      setTimeout(
        () => {
          setLines((prev) => [...prev, line]);
        },
        (i + 1) * LINE_DELAY_MS,
      ),
    );

    const completeTimer = setTimeout(
      onSequenceComplete,
      (sequence.length + 1) * LINE_DELAY_MS,
    );

    return () => {
      lineTimers.forEach(clearTimeout);
      clearTimeout(completeTimer);
    };
  }, [status, file, onSequenceComplete]);

  const allLines = [...lines, ...extraLines];

  // Fixed-height log, not just a minimum — otherwise the panel grows
  // taller with every anchored line instead of scrolling internally.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [allLines.length]);

  return (
    <div className="flex h-[420px] flex-col border border-black bg-black font-mono text-sm text-white">
      <div className="flex items-center gap-2 border-b border-white/20 px-4 py-3">
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="ml-2 text-xs uppercase tracking-widest text-white">
          verification.log
        </span>
      </div>

      <div ref={logRef} className="flex-1 space-y-2 overflow-y-auto p-6">
        {allLines.length === 0 && (
          <p className="text-xs uppercase tracking-widest">
            {"[ AWAITING INPUT ]"}
          </p>
        )}
        {allLines.map((line, i) => {
          const isAlert =
            line.startsWith("[REJECTED]") || line.startsWith("[FAILURE]");
          return (
            <SnapIn key={i}>
              {isAlert ? (
                <p className="border-2 border-black bg-white px-3 py-2 font-bold text-black break-words">
                  {line}
                </p>
              ) : (
                <p className="break-all">{line}</p>
              )}
            </SnapIn>
          );
        })}
      </div>
    </div>
  );
}
