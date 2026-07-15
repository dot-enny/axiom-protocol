import Link from "next/link";
import { truncateMiddle } from "@/lib/format";

interface VaultAsset {
  name: string;
  tokenId: string;
  tvl: string;
}

const VAULT_ASSETS: VaultAsset[] = [
  {
    name: "Miami Commercial Real Estate",
    tokenId: "CABC5F3B9C1D2E4F6A8B0C2D4E6F8A0B2C4D6E8F0A2B4C6D89921",
    tvl: "$4,250,000",
  },
  {
    name: "US Treasury Bill Pool #4",
    tokenId: "CBX27QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA4410",
    tvl: "$12,000,000",
  },
  {
    name: "Global Supply Chain Manifest A",
    tokenId: "CDD1QP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY8832",
    tvl: "$850,000",
  },
];

export function AssetLedger() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse whitespace-nowrap font-mono text-sm">
        <thead className="border-b border-black">
          <tr className="text-left">
            <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500 md:px-10">
              Asset Name
            </th>
            <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500">
              Token ID
            </th>
            <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500">
              TVL
            </th>
            <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500">
              Compliance Proof
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black">
          {VAULT_ASSETS.map((asset) => (
            <tr key={asset.tokenId}>
              <td className="px-6 py-4 md:px-10">{asset.name}</td>
              <td className="px-6 py-4">{truncateMiddle(asset.tokenId, 4, 4)}</td>
              <td className="px-6 py-4">{asset.tvl}</td>
              <td className="px-6 py-4">
                <Link
                  href="/verify"
                  className="border border-black px-2 py-1 text-xs uppercase tracking-widest transition-colors duration-100 hover:bg-black hover:text-white"
                >
                  {"[ View Hash ]"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
