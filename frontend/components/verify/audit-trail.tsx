import { formatTimestampWithSeconds } from "@/lib/format";

interface AuditTrailProps {
  timestampIso: string;
}

interface TimelineNode {
  label: string;
  title: string;
  subtext: string;
  offsetMinutes: number;
}

const CONTRACT_ID = "CCO6FJTO6E6KWHTICBG6AISDJRQ4TELNEWV5FX7TUQCTPVD4RZ2BCAVK";

const NODES: TimelineNode[] = [
  {
    label: "NODE 1: ORIGINATION",
    title: "Client-Side SHA-256 Checksum Computed",
    subtext: "Zero-knowledge browser sandbox.",
    offsetMinutes: -2,
  },
  {
    label: "NODE 2: PROTOCOL ESCROW",
    title: "Anchored to Soroban Smart Contract",
    subtext: `Contract ID: ${CONTRACT_ID}`,
    offsetMinutes: 0,
  },
  {
    label: "NODE 3: DEAL ROOM",
    title: "Multi-Party Signatures Executed",
    subtext: "Threshold: 3/3 Signatures Verified.",
    offsetMinutes: 5,
  },
  {
    label: "NODE 4: ASSET VAULT",
    title: "Tokenized Asset Minted",
    subtext: "Wrapped as Stellar compliance asset.",
    offsetMinutes: 6,
  },
];

export function AuditTrail({ timestampIso }: AuditTrailProps) {
  const baseMs = new Date(timestampIso).getTime();

  return (
    <div className="mt-6 border-t border-white pt-6">
      <p className="inline-block border border-white px-2 py-1 font-mono text-xs uppercase tracking-widest">
        Cryptographic Audit Trail
      </p>

      <ol className="mt-6 border-l-2 border-white pl-6">
        {NODES.map((node) => {
          const nodeTimeIso = new Date(
            baseMs + node.offsetMinutes * 60_000
          ).toISOString();

          return (
            <li key={node.label} className="relative pb-8 last:pb-0">
              <span className="absolute -left-[31px] top-1 h-2.5 w-2.5 border border-white bg-black" />
              <p className="font-mono text-xs uppercase tracking-widest">
                {`[ ${node.label} ]`}
              </p>
              <p className="mt-1 font-mono text-sm font-bold text-white">
                {node.title}
              </p>
              <p className="mt-1 break-all font-mono text-xs text-white">
                {node.subtext}
              </p>
              <p className="mt-2 font-mono text-xs text-white">
                {formatTimestampWithSeconds(nodeTimeIso)}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
