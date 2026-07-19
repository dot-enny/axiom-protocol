import { NextResponse, type NextRequest } from "next/server";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import {
  buildApproveDealTransaction,
  buildExecuteDealTransaction,
  buildProposeDealTransaction,
  confirmTransaction,
  prepareTransaction,
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

function isValidSignerList(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((s) => typeof s === "string" && StrKey.isValidEd25519PublicKey(s))
  );
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

  const { hash, issuer, signers, threshold } = (body ?? {}) as {
    hash?: unknown;
    issuer?: unknown;
    signers?: unknown;
    threshold?: unknown;
  };

  if (typeof hash !== "string" || !HASH_PATTERN.test(hash)) {
    return errorResponse(
      400,
      "`hash` must be a 64-character hexadecimal SHA-256 string."
    );
  }
  if (typeof issuer !== "string" || !StrKey.isValidEd25519PublicKey(issuer)) {
    return errorResponse(400, "`issuer` must be a valid Stellar public address.");
  }
  if (!isValidSignerList(signers)) {
    return errorResponse(
      400,
      "`signers` must be a non-empty array of valid Stellar public addresses."
    );
  }
  if (
    typeof threshold !== "number" ||
    !Number.isInteger(threshold) ||
    threshold <= 0 ||
    threshold > signers.length
  ) {
    return errorResponse(
      400,
      "`threshold` must be an integer greater than 0 and no greater than `signers.length`."
    );
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
    const unsignedTx = await buildProposeDealTransaction(
      serverKeypair.publicKey(),
      normalizedHash,
      signers,
      threshold,
      issuer
    );
    preparedTx = await prepareTransaction(unsignedTx);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown simulation error";
    return errorResponse(400, `Soroban simulation failed: ${message}`);
  }

  let txHash: string;
  try {
    preparedTx.sign(serverKeypair);
    txHash = await submitSignedTransaction(preparedTx.toXDR());
    await confirmTransaction(txHash);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown submission error";
    return errorResponse(500, `Transaction submission failed: ${message}`);
  }

  // Single-party attestation (threshold 1, exactly one signer) should
  // stay frictionless — there's no second party to wait on, so
  // immediately chase the proposal with the same signer's approval and
  // execution instead of leaving it permanently pending. This is
  // best-effort: the deal was already proposed successfully on-chain by
  // this point, so a failure here is reported alongside that success
  // rather than as an overall 500.
  let autoExecuted = false;
  let autoExecuteError: string | null = null;
  if (threshold === 1 && signers.length === 1) {
    const soleSigner = signers[0];
    try {
      const approveTx = await prepareTransaction(
        await buildApproveDealTransaction(
          serverKeypair.publicKey(),
          normalizedHash,
          soleSigner
        )
      );
      approveTx.sign(serverKeypair);
      const approveTxHash = await submitSignedTransaction(approveTx.toXDR());
      await confirmTransaction(approveTxHash);

      const executeTx = await prepareTransaction(
        await buildExecuteDealTransaction(
          serverKeypair.publicKey(),
          normalizedHash,
          soleSigner
        )
      );
      executeTx.sign(serverKeypair);
      const executeTxHash = await submitSignedTransaction(executeTx.toXDR());
      await confirmTransaction(executeTxHash);

      autoExecuted = true;
    } catch (err) {
      autoExecuteError =
        err instanceof Error ? err.message : "Unknown auto-execution error";
    }
  }

  return NextResponse.json(
    {
      id: txHash,
      txHash,
      status: autoExecuted ? "executed" : "confirmed",
      hash: normalizedHash,
      autoExecuted,
      ...(autoExecuteError ? { autoExecuteError } : {}),
      ledger: {
        network: "stellar-testnet",
        contract_id: process.env.NEXT_PUBLIC_CONTRACT_ID ?? "unknown",
        timestamp: Math.floor(Date.now() / 1000),
      },
    },
    { status: 200 }
  );
}
