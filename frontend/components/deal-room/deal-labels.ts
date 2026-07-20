import type { Deal } from "@/components/deal-room/deal-room-workspace";

export function requiredSigsLabel(deal: Deal): string {
  switch (deal.queryStatus) {
    case "loading":
      return "Querying…";
    case "error":
    case "not-found":
      return "—";
    case "found":
      return `${deal.dealState!.approvals.length}/${deal.dealState!.threshold}`;
  }
}

export function statusLabel(deal: Deal): string {
  switch (deal.queryStatus) {
    case "loading":
      return "Querying Chain...";
    case "error":
      return "Chain Query Failed";
    case "not-found":
      return "No On-Chain Record";
    case "found":
      return deal.dealState!.executedAt > 0 ? "Executed" : "Action Required";
  }
}
