"use client";

import { truncateMiddle } from "@/lib/format";
import type { Deal } from "@/components/deal-room/deal-room-workspace";

interface PendingQueueProps {
  deals: Deal[];
  onSelect: (dealId: string) => void;
}

export function PendingQueue({ deals, onSelect }: PendingQueueProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse whitespace-nowrap font-mono text-sm">
        <thead className="border-b border-black">
          <tr className="text-left">
            <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500 md:px-10">
              Document Hash
            </th>
            <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500">
              Asset Type
            </th>
            <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500">
              Required Sigs
            </th>
            <th className="px-6 py-4 font-mono text-xs font-normal uppercase tracking-widest text-slate-500">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black">
          {deals.map((deal) => (
            <tr
              key={deal.id}
              onClick={() => onSelect(deal.id)}
              className="cursor-pointer transition-colors duration-100 hover:bg-black hover:text-white"
            >
              <td className="px-6 py-4 md:px-10">
                {truncateMiddle(deal.hash, 5, 4)}
              </td>
              <td className="px-6 py-4">{deal.assetType}</td>
              <td className="px-6 py-4">{deal.requiredSigs}</td>
              <td className="px-6 py-4 font-bold">{deal.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
