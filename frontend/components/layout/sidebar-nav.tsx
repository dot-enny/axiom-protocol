"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLedgerStore } from "@/lib/useLedgerStore";

interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "unknown";
const DEAL_ROOM_HREF = "/deal-room";

const NAV_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Verify Ledger", href: "/verify" },
  { label: "Developer API", href: "/developers" },
  { label: "Deal Room", href: DEAL_ROOM_HREF },
  { label: "Tokenized Vault", href: "/dashboard/vault" },
  {
    label: "Ledger Explorer",
    href: `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`,
    external: true,
  },
];

const ROW =
  "flex shrink-0 items-center gap-2 whitespace-nowrap border-r border-black px-4 py-3 font-mono text-xs uppercase tracking-widest transition-colors duration-100 md:w-full md:shrink md:justify-between md:whitespace-normal md:border-r-0 md:border-b md:px-6 md:py-4 md:last:border-b-0";

export function SidebarNav() {
  const pathname = usePathname();
  const records = useLedgerStore();
  const pendingCount = records.length;

  return (
    <nav className="flex overflow-x-auto border-b border-black md:flex-col md:overflow-visible md:border-b-0">
      {NAV_LINKS.map((link) => {
        if (link.external) {
          return (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={`${ROW} bg-white text-black hover:bg-black hover:text-white`}
            >
              <span>{link.label}</span>
              <span aria-hidden>↗</span>
            </a>
          );
        }

        const isActive = pathname === link.href;
        const badge =
          link.href === DEAL_ROOM_HREF && pendingCount > 0
            ? `[ ${pendingCount} PENDING ]`
            : null;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`${ROW} ${
              isActive
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-black hover:text-white"
            }`}
          >
            <span>{link.label}</span>
            {badge && (
              <span className="shrink-0 whitespace-nowrap border border-current px-1.5 py-0.5 text-[10px] tracking-normal">
                {badge}
              </span>
            )}
            {/* The badge already carries the active row's trailing content —
                showing the arrow too pushes the label right to the edge of
                the sidebar's available width, so it's one or the other. */}
            {isActive && !badge && <span aria-hidden>→</span>}
          </Link>
        );
      })}
    </nav>
  );
}
