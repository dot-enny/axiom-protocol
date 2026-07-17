const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const KEY_BODY_LENGTH = 55;

function hashToSeed(value: string): number {
  let hash = 0x811c9dc5; // FNV-1a offset basis
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32 — a small, deterministic PRNG seeded by a 32-bit integer. */
function mulberry32(seed: number): () => number {
  let state = seed;
  return function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministically generates a string that mimics the shape of a
 * Stellar public key ("G" followed by 55 base32 characters) from a
 * document hash and a role label. The same hash + role always produces
 * the same output, so mock parties (auditor, counterparty, etc.) stay
 * stable across reloads without any hardcoded addresses.
 */
export function generateMockStellarKey(hash: string, role: string): string {
  const random = mulberry32(hashToSeed(`${hash}:${role}`));

  let body = "";
  for (let i = 0; i < KEY_BODY_LENGTH; i++) {
    body += BASE32_ALPHABET[Math.floor(random() * BASE32_ALPHABET.length)];
  }

  return `G${body}`;
}
