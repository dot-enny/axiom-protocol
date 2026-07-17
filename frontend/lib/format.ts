export function truncateMiddle(value: string, head: number, tail: number): string {
  if (value.length <= head + tail) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  return `${y}-${m}-${d} ${h}:${min} UTC`;
}

/**
 * Deterministically derives a dollar figure between $1,000,000 and
 * $25,000,000 from a document hash, so the same anchored record always
 * shows the same value across reloads instead of a random one.
 */
export function calculateAssetValue(hash: string): number {
  const seed = parseInt(hash.slice(0, 8), 16) || 0;
  const RANGE = 25_000_000 - 1_000_000;
  return 1_000_000 + (seed % RANGE);
}

export function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US")}`;
}

export function formatTimestampWithSeconds(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getUTCFullYear();
  const m = pad(date.getUTCMonth() + 1);
  const d = pad(date.getUTCDate());
  const h = pad(date.getUTCHours());
  const min = pad(date.getUTCMinutes());
  const s = pad(date.getUTCSeconds());
  return `${y}-${m}-${d} ${h}:${min}:${s} UTC`;
}
