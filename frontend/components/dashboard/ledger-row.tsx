"use client";

import { motion } from "framer-motion";

interface LedgerRowProps {
  hash: string;
  timestamp: string;
  issuer: string;
  delay?: number;
}

function truncateMiddle(value: string, head: number, tail: number): string {
  if (value.length <= head + tail) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function LedgerRow({ hash, timestamp, issuer, delay = 0 }: LedgerRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.15, delay, ease: "linear" }}
    >
      <td className="px-6 py-4 md:px-10">{truncateMiddle(hash, 10, 8)}</td>
      <td className="px-6 py-4 text-slate-600">{timestamp}</td>
      <td className="px-6 py-4 text-slate-600">{truncateMiddle(issuer, 6, 6)}</td>
    </motion.tr>
  );
}
