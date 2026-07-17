import type { ReactNode } from "react";

function CornerMark({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={`pointer-events-none fixed z-[60] font-mono text-sm leading-none text-black select-none ${className}`}
    >
      +
    </span>
  );
}

/**
 * Outer shell that exposes the page grid: full-height side borders and
 * corner registration marks, in the spirit of a print/blueprint layout.
 * Marks are viewport-fixed (not absolute within the scrolling frame) so
 * they stay put like a print crop mark instead of scrolling away with
 * the page. The horizontal offset replicates `mx-auto max-w-[1440px]`'s
 * centering math so they still land exactly on the frame's border corner
 * on wide viewports, not the raw screen edge.
 */
export function Frame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto max-w-[1440px] border-x border-black">
      <CornerMark className="top-1 left-[max(0.25rem,calc((100vw-1440px)/2+0.25rem))]" />
      <CornerMark className="top-1 right-[max(0.25rem,calc((100vw-1440px)/2+0.25rem))]" />
      <CornerMark className="bottom-1 left-[max(0.25rem,calc((100vw-1440px)/2+0.25rem))]" />
      <CornerMark className="bottom-1 right-[max(0.25rem,calc((100vw-1440px)/2+0.25rem))]" />
      {children}
    </div>
  );
}
