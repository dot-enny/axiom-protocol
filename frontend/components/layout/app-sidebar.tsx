import Link from "next/link";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { WalletConnector } from "@/components/dashboard/wallet-connector";

export function AppSidebar() {
  return (
    <aside className="border-b border-black md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-6 py-4 border-b border-black md:py-5">
        <Link href="/" className="font-mono text-lg font-bold tracking-tight">
          AXIOM
        </Link>
        <p className="hidden font-mono text-xs uppercase tracking-widest text-slate-500 md:mt-1 md:block">
          Console
        </p>
      </div>

      <SidebarNav />

      <div className="hidden md:block md:flex-1" />

      <WalletConnector />
    </aside>
  );
}
