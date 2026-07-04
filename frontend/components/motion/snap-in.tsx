"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface SnapInProps {
  children: ReactNode;
  delay?: number;
  className?: string;
}

/**
 * Institutional Brutalism has no soft fades or spring physics — content
 * snaps into place. A short, linear, single-easing transition reads as
 * "appearing" rather than "fading in."
 */
export function SnapIn({ children, delay = 0, className = "" }: SnapInProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.15, delay, ease: "linear" }}
    >
      {children}
    </motion.div>
  );
}
