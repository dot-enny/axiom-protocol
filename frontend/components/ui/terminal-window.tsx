import type { ReactNode } from "react";

interface TerminalWindowProps {
  title?: string;
  children: ReactNode;
}

/**
 * Brutalist terminal chrome: window controls are square, not the usual
 * traffic-light circles — no rounded corners, no color, per the design
 * system.
 */
export function TerminalWindow({
  title = "axiom.sh",
  children,
}: TerminalWindowProps) {
  return (
    <div className="border border-white">
      <div className="flex items-center gap-2 border-b border-white px-4 py-3">
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="ml-2 font-mono text-xs uppercase tracking-widest text-white">
          {title}
        </span>
      </div>
      <div className="p-6 md:p-8">{children}</div>
    </div>
  );
}
