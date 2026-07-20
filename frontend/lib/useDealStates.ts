"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { queryDealState, type DealState } from "@/lib/soroban";

export type DealQueryStatus = "loading" | "found" | "not-found" | "error";

export interface DealQueryEntry {
  status: DealQueryStatus;
  dealState: DealState | null;
  error: string | null;
}

const LOADING_ENTRY: DealQueryEntry = { status: "loading", dealState: null, error: null };

async function queryOne(hash: string): Promise<DealQueryEntry> {
  try {
    const state = await queryDealState(hash);
    return { status: state ? "found" : "not-found", dealState: state, error: null };
  } catch (err) {
    return {
      status: "error",
      dealState: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Fetches real on-chain `DealState` for every hash in `hashes`, in
 * parallel (fine at expected RWA deal volume), re-running whenever the
 * hash *set* changes (a new anchor added) rather than on every
 * unrelated re-render. Returns the current map plus `refresh(hash)` to
 * re-query a single row after an approve/execute action, or when
 * re-entering a deal's detail view, without refetching every other row.
 */
export function useDealStates(hashes: string[]): {
  entries: Map<string, DealQueryEntry>;
  refresh: (hash: string) => Promise<void>;
} {
  const [entries, setEntries] = useState<Map<string, DealQueryEntry>>(new Map());
  const epoch = useRef(0);
  const hashesKey = hashes.join(",");

  useEffect(() => {
    const currentEpoch = ++epoch.current;

    setEntries((prev) => {
      const next = new Map<string, DealQueryEntry>();
      for (const hash of hashes) next.set(hash, prev.get(hash) ?? LOADING_ENTRY);
      return next;
    });

    Promise.all(hashes.map(async (hash) => [hash, await queryOne(hash)] as const)).then(
      (results) => {
        if (epoch.current !== currentEpoch) return; // superseded by a newer batch
        setEntries((prev) => {
          const next = new Map(prev);
          for (const [hash, entry] of results) next.set(hash, entry);
          return next;
        });
      }
    );
    // hashesKey (not hashes) is the real dependency — a new array
    // reference with the same contents shouldn't re-trigger every row's
    // query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hashesKey]);

  const refresh = useCallback(async (hash: string) => {
    setEntries((prev) => new Map(prev).set(hash, { ...(prev.get(hash) ?? LOADING_ENTRY), status: "loading" }));
    const entry = await queryOne(hash);
    setEntries((prev) => new Map(prev).set(hash, entry));
  }, []);

  return { entries, refresh };
}
