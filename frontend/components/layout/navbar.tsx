import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-black bg-white/95 px-6 py-4 backdrop-blur-sm md:px-10">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-lg font-bold tracking-tight">
          AXIOM
        </span>
        <span className="hidden font-mono text-xs uppercase tracking-widest text-slate-500 sm:inline">
          / Protocol
        </span>
      </div>

      <nav className="flex items-center gap-8">
        <a
          href="#how-it-works"
          className="hidden font-mono text-xs font-medium uppercase tracking-widest text-black hover:underline sm:inline"
        >
          How It Works
        </a>
        <Button href="/dashboard" className="px-4 py-2 text-xs">
          Launch App
        </Button>
      </nav>
    </header>
  );
}
