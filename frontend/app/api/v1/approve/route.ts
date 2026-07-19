import { NextResponse, type NextRequest } from "next/server";
import { Keypair, StrKey } from "@stellar/stellar-sdk";
import {
  buildApproveDealTransaction,
  buildExecuteDealTransaction,
  confirmTransaction,
  prepareTransaction,
  queryDealState,
  submitSignedTransaction,
} from "@/lib/soroban";

// Same reasoning as app/api/v1/anchor/route.ts: touches SERVER_SECRET_KEY
// and stellar-sdk's Node crypto/Buffer needs, neither of which Edge fully
// provides.
export const runtime = "nodejs";

const HASH_PATTERN = /^[a-f0-9]{64}$/i;

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "Request body must be valid JSON.");
  }

  const { hash, signerAddress } = (body ?? {}) as {
    hash?: unknown;
    signerAddress?: unknown;
  };

  if (typeof hash !== "string" || !HASH_PATTERN.test(hash)) {
    return errorResponse(
      400,
      "`hash` must be a 64-character hexadecimal SHA-256 string."
    );
  }
  if (
    typeof signerAddress !== "string" ||
    !StrKey.isValidEd25519PublicKey(signerAddress)
  ) {
    return errorResponse(
      400,
      "`signerAddress` must be a valid Stellar public address."
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

  let approveTxHash: string;
  try {
    const approveTx = await prepareTransaction(
      await buildApproveDealTransaction(
        serverKeypair.publicKey(),
        normalizedHash,
        signerAddress
      )
    );
    approveTx.sign(serverKeypair);
    approveTxHash = await submitSignedTransaction(approveTx.toXDR());
    await confirmTransaction(approveTxHash);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown approval error";
    return errorResponse(500, `Approval failed: ${message}`);
  }

  // Once this approval lands, re-check the deal's real on-chain state —
  // if it now has enough approvals to cross the threshold, settle it
  // immediately rather than waiting on a separate explicit call.
  let executed = false;
  let executeTxHash: string | null = null;
  try {
    const deal = await queryDealState(normalizedHash);
    if (deal && deal.executedAt === 0 && deal.approvals.length >= deal.threshold) {
      const executeTx = await prepareTransaction(
        await buildExecuteDealTransaction(
          serverKeypair.publicKey(),
          normalizedHash,
          signerAddress
        )
      );
      executeTx.sign(serverKeypair);
      executeTxHash = await submitSignedTransaction(executeTx.toXDR());
      await confirmTransaction(executeTxHash);
      executed = true;
    }
  } catch (err) {
    // The approval itself already succeeded and is confirmed on-chain —
    // report that success, with execution left pending, rather than a
    // 500 that would misrepresent the approval as having failed too.
    return NextResponse.json(
      {
        hash: normalizedHash,
        approveTxHash,
        executed: false,
        executeError: err instanceof Error ? err.message : "Unknown execution error",
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    {
      hash: normalizedHash,
      approveTxHash,
      executed,
      executeTxHash,
    },
    { status: 200 }
  );
}
