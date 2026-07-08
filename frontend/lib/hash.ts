/**
 * Computes the SHA-256 digest of a File entirely in the browser via the
 * Web Crypto API. The file is read into memory as an ArrayBuffer and
 * never leaves the client — no network request is involved.
 */
export async function sha256Hex(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
