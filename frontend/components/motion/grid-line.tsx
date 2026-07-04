"use client";

import { motion } from "framer-motion";

interface GridLineProps {
  /** Tailwind border classes controlling which edge(s) draw in, e.g. "border-t md:border-l". */
  edgeClassName: string;
  delay?: number;
}

/**
 * A single grid divider that snaps from 0 to 100 opacity — the line
 * "draws itself" instantly rather than fading. Parents stagger the
 * `delay` across siblings so a row of these reads as the grid
 * assembling itself.
 */
export function GridLine({ edgeClassName, delay = 0 }: GridLineProps) {
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none absolute inset-0 border-black ${edgeClassName}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.08, delay, ease: "linear" }}
    />
  );
}
