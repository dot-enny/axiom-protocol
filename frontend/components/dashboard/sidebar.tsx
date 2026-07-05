import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DashboardSidebar() {
  return (
    <aside className="flex items-center justify-between border-b border-black px-6 py-4 md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:flex-col md:items-stretch md:justify-between md:border-b-0 md:border-r md:px-0 md:py-0">
      <div className="md:border-b md:border-black md:px-6 md:py-5">
        <Link href="/" className="font-mono text-lg font-bold tracking-tight">
          AXIOM
        </Link>
        <p className="hidden font-mono text-xs uppercase tracking-widest text-slate-500 md:mt-1 md:block">
          Console
        </p>
      </div>

      <Button className="px-4 py-2 text-xs md:mx-6 md:mb-6 md:py-3">
        Connect Wallet
      </Button>
    </aside>
  );
}
