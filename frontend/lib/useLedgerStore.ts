"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "axiom.ledger.v1";
const EMPTY_RECORDS: AnchorRecord[] = [];

export interface AnchorRecord {
  id: string;
  filename: string;
  hash: string;
  issuer: string;
  timestamp: string;
  txHash?: string;
  /** Declared USD value at anchor time; 0 for non-financial/compliance documents. */
  value: number;
  /** Required-signature threshold (1-3) configured at anchor time. */
  threshold: number;
}

type Listener = () => void;

let records: AnchorRecord[] = EMPTY_RECORDS;
let hydrated = false;
const listeners = new Set<Listener>();

function readFromStorage(): AnchorRecord[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_RECORDS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : EMPTY_RECORDS;
  } catch {
    return EMPTY_RECORDS;
  }
}

function ensureHydrated(): void {
  if (hydrated || typeof window === "undefined") return;
  records = readFromStorage();
  hydrated = true;
}

function notify(): void {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): AnchorRecord[] {
  ensureHydrated();
  return records;
}

function getServerSnapshot(): AnchorRecord[] {
  return EMPTY_RECORDS;
}

/** Persists a new anchor record and notifies any subscribed `useLedgerStore()` callers. */
export function addRecord(record: Omit<AnchorRecord, "id" | "timestamp">): void {
  ensureHydrated();

  const newRecord: AnchorRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  };

  records = [newRecord, ...records];

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Storage can legitimately fail (private browsing, quota) — the
    // in-memory state above still updates, so the UI stays correct for
    // this session even if it won't survive a reload.
  }

  notify();
}

export function getRecords(): AnchorRecord[] {
  ensureHydrated();
  return records;
}

/** Reactive read — re-renders the caller whenever `addRecord` persists a new entry. */
export function useLedgerStore(): AnchorRecord[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
