"use client";

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, MouseEvent } from "react";
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
  onClear: () => void;
}

function extensionLabel(filename: string): string {
  const ext = filename.split(".").pop();
  return ext ? ext.slice(0, 4).toUpperCase() : "FILE";
}

export function Dropzone({ status, file, isAnchoring, onFileDropped, onClear }: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  // The raw File never leaves this component or touches the network —
  // it only backs a local, memory-based object URL for the thumbnail
  // preview. Hashing (the only thing that leaves this component) still
  // happens from the dropped File directly in onFileDropped.
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { address } = useWallet();
  // "done" isn't busy — a finished/anchored document shouldn't block
  // dropping the next one. Only the hashing animation and an in-flight
  // anchor transaction (which "file" is mid-use by) should block.
  const isBusy = status === "processing" || isAnchoring;

  // Object URLs are a browser-managed memory reference, not garbage
  // collected automatically — revoke the previous one whenever it's
  // replaced or this component unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function loadPreview(dropped: File) {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(dropped);
    });
    setPreviewFile(dropped);
    onFileDropped(dropped);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (isBusy) return;
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) loadPreview(dropped);
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
    if (dropped) loadPreview(dropped);
  }

  function handleClick() {
    if (!isBusy) inputRef.current?.click();
  }

  function handleRemove(e: MouseEvent) {
    e.stopPropagation();
    if (isBusy) return;
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPreviewFile(null);
    if (inputRef.current) inputRef.current.value = "";
    onClear();
  }

  const activeInvert = isDragOver ? "bg-black text-white" : "bg-white text-black";
  const cursor = isBusy ? "cursor-default" : "cursor-pointer";
  const isImagePreview = previewFile?.type.startsWith("image/") ?? false;

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

      {previewFile && previewUrl && (
        <div className="relative mb-6 rounded-none border-2 border-black bg-white">
          <button
            type="button"
            onClick={handleRemove}
            disabled={isBusy}
            className="absolute -right-3 -top-3 z-10 rounded-none border-2 border-black bg-white px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-black transition-colors duration-100 hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {"[ X ] REMOVE"}
          </button>

          {isImagePreview ? (
            // Local blob: object URL — never optimized or served by
            // Next's image pipeline, and the file never leaves the browser.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt={previewFile.name}
              className="h-40 w-40 rounded-none object-cover grayscale contrast-125"
            />
          ) : (
            <div className="flex h-40 w-40 items-center justify-center">
              <span className="font-mono text-2xl font-black tracking-tighter">
                {`[ ${extensionLabel(previewFile.name)} ]`}
              </span>
            </div>
          )}
        </div>
      )}

      {status === "idle" && !previewFile && (
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
