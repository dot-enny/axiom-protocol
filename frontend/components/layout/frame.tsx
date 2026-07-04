import type { ReactNode } from "react";

function CornerMark({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute z-[60] font-mono text-sm leading-none text-black select-none ${className}`}
    >
      +
    </span>
  );
}

/**
 * Outer shell that exposes the page grid: full-height side borders and
 * corner registration marks, in the spirit of a print/blueprint layout.
 * Marks sit just inside the border so they stay visible at any viewport
 * width, including when the frame spans edge-to-edge below max-w.
 */
export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto max-w-[1440px] border-x border-black">
      <CornerMark className="left-1 top-1" />
      <CornerMark className="right-1 top-1" />
      <CornerMark className="left-1 bottom-1" />
      <CornerMark className="right-1 bottom-1" />
      {children}
    </div>
  );
}
