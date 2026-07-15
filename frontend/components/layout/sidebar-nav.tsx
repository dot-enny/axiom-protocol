"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

const CONTRACT_ID = "CCO6FJTO6E6KWHTICBG6AISDJRQ4TELNEWV5FX7TUQCTPVD4RZ2BCAVK";

const NAV_LINKS: NavLink[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Verify Ledger", href: "/verify" },
  { label: "Developer API", href: "/developers" },
  {
    label: "Ledger Explorer",
    href: `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`,
    external: true,
  },
];

const ROW =
  "flex min-w-0 flex-1 items-center justify-center gap-1 border-r border-black px-2 py-3 text-center font-mono text-[11px] uppercase tracking-normal transition-colors duration-100 last:border-r-0 md:flex-none md:justify-between md:border-r-0 md:border-b md:px-6 md:py-4 md:text-xs md:tracking-widest md:last:border-b-0";

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex border-b border-black md:flex-col md:border-b-0">
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
              <span className="min-w-0 break-words">{link.label}</span>
              <span aria-hidden className="shrink-0">↗</span>
            </a>
          );
        }

        const isActive = pathname === link.href;
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
            <span className="min-w-0 break-words">{link.label}</span>
            {isActive && (
              <span aria-hidden className="shrink-0">
                →
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
