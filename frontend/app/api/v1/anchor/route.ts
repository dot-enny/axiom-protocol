import { NextResponse, type NextRequest } from "next/server";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import {
  buildAnchorProofTransaction,
  confirmTransaction,
  prepareAnchorProofTransaction,
  submitSignedTransaction,
} from "@/lib/soroban";

// This route touches SERVER_SECRET_KEY and must never run at the edge —
// stellar-sdk also relies on Node's crypto/Buffer, which Edge doesn't
// fully provide.
export const runtime = "nodejs";

const BEARER_PREFIX = "Bearer ax_live_";
const HASH_PATTERN = /^[a-f0-9]{64}$/i;

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith(BEARER_PREFIX)) {
    return errorResponse(
      401,
      "Missing or invalid Authorization header. Expected 'Bearer ax_live_...'."
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Request body must be valid JSON.");
  }

  const { hash, issuer } = (body ?? {}) as { hash?: unknown; issuer?: unknown };

  if (typeof hash !== "string" || !HASH_PATTERN.test(hash)) {
    return errorResponse(
      400,
      "`hash` must be a 64-character hexadecimal SHA-256 string."
    );
  }
  if (typeof issuer !== "string" || !StrKey.isValidEd25519PublicKey(issuer)) {
    return errorResponse(400, "`issuer` must be a valid Stellar public address.");
  }

  const secretKey = process.env.SERVER_SECRET_KEY;
  if (!secretKey) {
    return errorResponse(500, "Server is not configured with SERVER_SECRET_KEY.");
  }

  let serverKeypair: Keypair;
  try {
    serverKeypair = Keypair.fromSecret(secretKey);
  } catch {
    return errorResponse(500, "SERVER_SECRET_KEY is not a valid Stellar secret key.");
  }

  const normalizedHash = hash.toLowerCase();

  let preparedTx;
  try {
    const unsignedTx = await buildAnchorProofTransaction(
      serverKeypair.publicKey(),
      normalizedHash,
      issuer
    );
    preparedTx = await prepareAnchorProofTransaction(unsignedTx);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown simulation error";
    return errorResponse(400, `Soroban simulation failed: ${message}`);
  }

  try {
    preparedTx.sign(serverKeypair);
    const txHash = await submitSignedTransaction(preparedTx.toXDR());
    await confirmTransaction(txHash);

    return NextResponse.json(
      {
        id: txHash,
        txHash,
        status: "confirmed",
        hash: normalizedHash,
        ledger: {
          network: "stellar-testnet",
          contract_id: process.env.NEXT_PUBLIC_CONTRACT_ID ?? "unknown",
          timestamp: Math.floor(Date.now() / 1000),
        },
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown submission error";
    return errorResponse(500, `Transaction submission failed: ${message}`);
  }
}
