export function Footer() {
  return (
    <footer className="flex flex-col gap-8 px-6 py-12 md:flex-row md:items-end md:justify-between md:px-10">
      <div>
        <div className="flex w-fit items-center rounded-none border-2 border-black">
          <span className="bg-black px-3 py-1 font-mono text-sm font-bold tracking-widest text-white">
            AXIOM
          </span>
          <span className="bg-white px-3 py-1 font-mono text-xs font-bold tracking-widest text-black">
            PROTOCOL
          </span>
        </div>
        <p className="mt-2 max-w-sm text-sm">
          Decentralized compliance infrastructure for real-world assets.
        </p>
      </div>

      <div className="font-mono text-xs uppercase tracking-widest">
        <p>Built on Stellar Soroban</p>
        <p className="mt-1">&copy; 2026 Axiom Protocol</p>
      </div>
    </footer>
  );
}
