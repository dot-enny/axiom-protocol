"use client";

import { SnapIn } from "@/components/motion/snap-in";

interface ExecutionLogProps {
  lines: string[];
}

export function ExecutionLog({ lines }: ExecutionLogProps) {
  return (
    <div className="flex min-h-[160px] flex-col border-t border-black bg-black font-mono text-sm text-white">
      <div className="flex items-center gap-2 border-b border-white/20 px-4 py-3">
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="ml-2 text-xs uppercase tracking-widest text-slate-400">
          execution.log
        </span>
      </div>

      <div className="flex-1 space-y-2 p-6">
        {lines.length === 0 && (
          <p className="text-slate-500">{"// awaiting execution"}</p>
        )}
        {lines.map((line, i) => (
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
