import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-black bg-white/95 px-6 py-4 backdrop-blur-sm md:px-10">
      <div className="flex w-fit items-center rounded-none border-2 border-black">
        <span className="bg-black px-3 py-1 font-mono text-sm font-bold tracking-widest text-white">
          AXIOM
        </span>
        <span className="bg-white px-3 py-1 font-mono text-xs font-bold tracking-widest text-black">
          PROTOCOL
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
