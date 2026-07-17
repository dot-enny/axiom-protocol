import { truncateMiddle } from "@/lib/format";

interface SignatureRowProps {
  role: string;
  address: string;
  signed: boolean;
  signedLabel: string;
}

function SignatureBadge({ signed, label }: { signed: boolean; label: string }) {
  if (signed) {
    return (
      <span className="rounded-none border border-black bg-black px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-white">
        {`[ ✓ ${label} ]`}
      </span>
    );
  }
  return (
    <span className="rounded-none border border-black bg-white px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-black">
      {"[ AWAITING SIGNATURE ]"}
    </span>
  );
}

export function SignatureRow({ role, address, signed, signedLabel }: SignatureRowProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-black px-6 py-6 last:border-b-0 sm:flex-row sm:items-center sm:justify-between md:px-10">
      <div className="min-w-0">
        <p className="font-mono text-xs uppercase tracking-widest">
          {role}
        </p>
        <p className="mt-1 font-mono text-sm">
          <span className="sm:hidden">{truncateMiddle(address, 6, 4)}</span>
          <span className="hidden break-all sm:inline">{address}</span>
        </p>
      </div>
      <SignatureBadge signed={signed} label={signedLabel} />
    </div>
  );
}
