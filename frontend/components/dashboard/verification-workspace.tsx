"use client";

import { useCallback, useState } from "react";
import { Dropzone } from "@/components/dashboard/dropzone";
import { TerminalConsole } from "@/components/dashboard/terminal-console";

export type VerificationStatus = "idle" | "processing" | "done";

export function VerificationWorkspace() {
  const [status, setStatus] = useState<VerificationStatus>("idle");
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFileDropped(file: File) {
    setFileName(file.name);
    setStatus("processing");
  }

  const handleSequenceComplete = useCallback(() => setStatus("done"), []);

  return (
    <div className="grid grid-cols-1 divide-y divide-black border-b border-black md:grid-cols-2 md:divide-x md:divide-y-0">
      <Dropzone
        status={status}
        fileName={fileName}
        onFileDropped={handleFileDropped}
      />
      <TerminalConsole
        status={status}
        fileName={fileName}
        onSequenceComplete={handleSequenceComplete}
      />
    </div>
  );
}
