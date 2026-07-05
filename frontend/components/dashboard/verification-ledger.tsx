import { LedgerRow } from "@/components/dashboard/ledger-row";
import { SnapIn } from "@/components/motion/snap-in";

const MOCK_ANCHORS = [
  {
    hash: "9f4a3b2c1e7d8f6a5b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a",
    timestamp: "2026-07-05 14:32 UTC",
    issuer: "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37",
  },
  {
    hash: "3d1c9b8a7f6e5d4c3b2a1908f7e6d5c4b3a29180f7e6d5c4b3a291807f6e5d4c",
    timestamp: "2026-07-05 11:07 UTC",
    issuer: "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ",
  },
  {
    hash: "b2e4f6a8c0d2e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4",
    timestamp: "2026-07-04 22:51 UTC",
    issuer: "GCKFBEIYTKP5RDBQMHYHRTFV5AVAO5JOEVX2UAXFDANW4LTZTE5ADFEZ",
  },
  {
    hash: "7a1f3e5d7c9b1a3f5e7d9c1b3a5f7e9d1c3b5a7f9e1d3c5b7a9f1e3d5c7b9a1f",
    timestamp: "2026-07-04 09:14 UTC",
    issuer: "GBXGQJWVLWOYHFLVTKWV5FGHA3T4NX5TE3RLLGERKMFCESGCVJXRLLZC",
  },
  {
    hash: "c4d6e8f0a2b4c6d8e0f2a4b6c8d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0b2c4d6",
    timestamp: "2026-07-03 17:45 UTC",
    issuer: "GDNXA5V6MHVYQ6VVSXQUOAMFF7HGDYCZKAP3AFOUAGXLXQBQMOXOJ7UL",
  },
];

export function VerificationLedger() {
  return (
    <section>
      <div className="border-b border-black px-6 py-10 md:px-10">
        <SnapIn>
          <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
            {"// Ledger"}
          </p>
          <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
            Recent Anchors
          </h2>
        </SnapIn>
      </div>

      <div className="overflow-x-auto border-b border-black">
        <table className="w-full min-w-[720px] border-collapse font-mono text-sm">
          <thead className="border-b border-black">
            <tr className="text-left">
              <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500 md:px-10">
                Document Hash
              </th>
              <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500">
                Timestamp
              </th>
              <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500">
                Issuer Address
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {MOCK_ANCHORS.map((anchor, i) => (
              <LedgerRow key={anchor.hash} {...anchor} delay={i * 0.04} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
