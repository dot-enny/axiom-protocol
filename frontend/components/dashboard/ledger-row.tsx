"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { truncateMiddle } from "@/lib/format";

interface LedgerRowProps {
  hash: string;
  timestamp: string;
  issuer: string;
  txHash?: string;
  delay?: number;
}

export function LedgerRow({ hash, timestamp, issuer, txHash, delay = 0 }: LedgerRowProps) {
  return (
    <motion.tr
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.15, delay, ease: "linear" }}
    >
      <td className="px-6 py-4 md:px-10">
        <Link
          href={{ pathname: "/verify", query: { hash } }}
          className="cursor-pointer border border-black px-2 py-1 transition-colors duration-100 hover:bg-black hover:text-white"
        >
          {truncateMiddle(hash, 10, 8)}
        </Link>
      </td>
      <td className="px-6 py-4">{timestamp}</td>
      <td className="px-6 py-4">{truncateMiddle(issuer, 6, 6)}</td>
      <td className="px-6 py-4">
        {txHash ? (
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer border border-black px-2 py-1 transition-colors duration-100 hover:bg-black hover:text-white"
          >
            {"[ TX ]"}
          </a>
        ) : (
          "—"
        )}
      </td>
    </motion.tr>
  );
}
