import Link from "next/link";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { WalletConnector } from "@/components/dashboard/wallet-connector";

export function AppSidebar() {
  return (
    <aside className="border-b border-black md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-6 py-4 border-b border-black md:py-5">
        <Link
          href="/"
          className="flex w-fit items-center rounded-none border-2 border-black"
        >
          <span className="bg-black px-2 py-1 font-mono text-xs font-bold tracking-widest text-white">
            AXIOM
          </span>
          <span className="bg-white px-2 py-1 font-mono text-[10px] font-bold tracking-widest text-black">
            PROTOCOL
          </span>
        </Link>
      </div>

      <SidebarNav />

      <div className="hidden md:block md:flex-1" />

      <WalletConnector />
    </aside>
  );
}
