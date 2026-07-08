"use client";

import { useCallback, useState } from "react";
import { Dropzone } from "@/components/dashboard/dropzone";
import { TerminalConsole } from "@/components/dashboard/terminal-console";
import { Button } from "@/components/ui/button";
import { sha256Hex } from "@/lib/hash";

export type VerificationStatus = "idle" | "processing" | "done";

export interface VerifiedFile {
  name: string;
  size: number;
  hash: string;
}

export function VerificationWorkspace() {
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [file, setFile] = useState<VerifiedFile | null>(null);

  async function handleFileDropped(dropped: File) {
    const hash = await sha256Hex(dropped);
    setFile({ name: dropped.name, size: dropped.size, hash });
    setStatus("processing");
  }

  const handleSequenceComplete = useCallback(() => setStatus("done"), []);

  return (
    <div className="border-b border-black">
      <div className="grid grid-cols-1 divide-y divide-black md:grid-cols-2 md:divide-x md:divide-y-0">
        <Dropzone status={status} file={file} onFileDropped={handleFileDropped} />
        <TerminalConsole
          status={status}
          file={file}
          onSequenceComplete={handleSequenceComplete}
        />
      </div>

      <div className="flex items-center justify-between border-t border-black px-6 py-6 md:px-10">
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
          {status === "done"
            ? "Hash ready — not yet anchored"
            : "Awaiting a verified hash"}
        </p>
        <Button disabled={status !== "done"} className="px-6 py-3 text-xs">
          Anchor to Soroban
        </Button>
      </div>
    </div>
  );
}
