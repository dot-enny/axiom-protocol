"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import type { VerificationStatus } from "@/components/dashboard/verification-workspace";

interface DropzoneProps {
  status: VerificationStatus;
  fileName: string | null;
  onFileDropped: (file: File) => void;
}

export function Dropzone({ status, fileName, onFileDropped }: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isBusy = status !== "idle";

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (isBusy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFileDropped(file);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!isBusy) setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileDropped(file);
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
          <p className="mt-2 font-mono text-xs text-slate-500">
            or click to browse
          </p>
        </>
      )}

      {status === "processing" && (
        <>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
            Processing
          </p>
          <p className="mt-4 max-w-xs truncate font-mono text-sm">{fileName}</p>
        </>
      )}

      {status === "done" && (
        <>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
            Status: Anchored
          </p>
          <p className="mt-4 max-w-xs truncate font-mono text-sm">{fileName}</p>
        </>
      )}
    </div>
  );
}
