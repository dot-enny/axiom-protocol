"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import type {
  VerificationStatus,
  VerifiedFile,
} from "@/components/dashboard/verification-workspace";
import { truncateMiddle } from "@/lib/format";
import { useWallet } from "@/components/dashboard/wallet-context";

interface DropzoneProps {
  status: VerificationStatus;
  file: VerifiedFile | null;
  isAnchoring: boolean;
  onFileDropped: (file: File) => void;
}

export function Dropzone({ status, file, isAnchoring, onFileDropped }: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { address } = useWallet();
  // "done" isn't busy — a finished/anchored document shouldn't block
  // dropping the next one. Only the hashing animation and an in-flight
  // anchor transaction (which "file" is mid-use by) should block.
  const isBusy = status === "processing" || isAnchoring;

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (isBusy) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onFileDropped(dropped);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isBusy) setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const dropped = e.target.files?.[0];
    if (dropped) onFileDropped(dropped);
  }

  function handleClick() {
    if (!isBusy) inputRef.current?.click();
  }

  const activeInvert = isDragOver ? "bg-black text-white" : "bg-white text-black";
  const cursor = isBusy ? "cursor-default" : "cursor-pointer";

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleClick}
      className={`flex min-h-[420px] flex-col items-center justify-center border-2 border-dashed border-black px-8 text-center transition-colors duration-100 ${activeInvert} ${cursor}`}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={handleChange}
        disabled={isBusy}
      />

      {status === "idle" && (
        <>
          <p className="font-mono text-sm uppercase tracking-widest">
            Drop Legal Document
          </p>
          <p className="mt-2 font-mono text-xs uppercase tracking-widest">
            or click to browse
          </p>
        </>
      )}

      {status === "processing" && (
        <>
          <p className="font-mono text-xs uppercase tracking-widest">
            Processing
          </p>
          <p className="mt-4 max-w-xs truncate font-mono text-sm">
            {file?.name}
          </p>
        </>
      )}

      {status === "done" && file && (
        <>
          <p className="font-mono text-xs uppercase tracking-widest">
            Status: Hash Ready
          </p>
          <p className="mt-4 max-w-xs truncate font-mono text-sm">
            {file.name}
          </p>
          <p className="mt-2 font-mono text-xs">
            {truncateMiddle(file.hash, 10, 8)}
          </p>
          {!address && !isAnchoring && (
            <p className="mt-4 font-mono text-xs uppercase tracking-widest">
              Connect wallet to anchor
            </p>
          )}
          {!isAnchoring && (
            <p className="mt-4 font-mono text-[11px] uppercase tracking-widest">
              Drop another document to replace this one
            </p>
          )}
        </>
      )}
    </div>
  );
}
