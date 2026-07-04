export function Footer() {
  return (
    <footer className="flex flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between md:px-10">
      <div>
        <span className="font-mono text-lg font-bold tracking-tight">
          AXIOM PROTOCOL
        </span>
        <p className="mt-2 max-w-sm text-sm text-slate-600">
          Decentralized compliance infrastructure for real-world assets.
        </p>
      </div>

      <div className="font-mono text-xs uppercase tracking-widest text-slate-500">
        <p>Built on Stellar Soroban</p>
        <p className="mt-1">&copy; 2026 Axiom Protocol</p>
      </div>
    </footer>
  );
}
