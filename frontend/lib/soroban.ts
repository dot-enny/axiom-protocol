import { Buffer } from "buffer";
import {
  Account,
  Address,
  Contract,
  BASE_FEE,
  Keypair,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
  xdr,
  type Transaction,
} from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const POLL_ATTEMPTS = 30;

const server = new rpc.Server(RPC_URL);

// A read-only simulation needs *some* syntactically valid source account to
// build the transaction envelope, but that account never signs or pays a
// fee — simulation doesn't touch it. Generating one throwaway keypair per
// page load avoids fetching (or funding) a real account just to query.
const READ_ONLY_SOURCE = Keypair.random().publicKey();

export interface ComplianceRecord {
  timestampIso: string;
  issuer: string;
  txHash?: string;
}

/** The on-chain state of a V2 m-of-n deal escrow, as returned by `get_deal`. */
export interface DealState {
  signers: string[];
  approvals: string[];
  threshold: number;
  /** 0 while pending; the ledger timestamp once `execute_deal` has run. */
  executedAt: number;
}

function getContractId(): string {
  const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
  if (!contractId) {
    throw new Error("NEXT_PUBLIC_CONTRACT_ID is not configured.");
  }
  return contractId;
}

/**
 * Builds an unsigned `anchor_proof` invocation against the real deployed
 * contract, using the account's actual on-chain sequence number (fetched
 * live from the Testnet RPC — no placeholder account data anymore).
 *
 * `sourceAddress` pays the fee and signs the envelope; `issuerAddress`
 * (defaults to `sourceAddress`) is the on-chain `issuer` argument whose
 * `require_auth()` must be satisfied. They differ only for the
 * server-signed API route, where the server's own key can't satisfy a
 * third party's auth — see `app/api/v1/anchor/route.ts`.
 */
export async function buildAnchorProofTransaction(
  sourceAddress: string,
  hash: string,
  issuerAddress: string = sourceAddress
): Promise<Transaction> {
  const account = await server.getAccount(sourceAddress);
  const contract = new Contract(getContractId());

  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "anchor_proof",
        nativeToScVal(hash),
        Address.fromString(issuerAddress).toScVal()
      )
    )
    .setTimeout(30)
    .build();
}

/**
 * Builds an unsigned `propose_deal` invocation against the real deployed
 * V2 escrow contract — the m-of-n replacement for the old single-issuer
 * `anchor_proof` call. Proposes `hash` with the given `signers` pool and
 * `threshold`; it does not itself approve or execute the deal (a 1-of-1
 * proposal still needs a follow-up `approve_deal`/`execute_deal` to
 * settle — not yet wired into this pipeline, see STATE.md).
 *
 * `sourceAddress` pays the fee and signs the envelope; `proposerAddress`
 * (defaults to `sourceAddress`) is the on-chain `proposer` argument whose
 * `require_auth()` must be satisfied. They differ only for the
 * server-signed API route, where the server's own key can't satisfy a
 * third party's auth — see `app/api/v1/anchor/route.ts`.
 */
export async function buildProposeDealTransaction(
  sourceAddress: string,
  hash: string,
  signers: string[],
  threshold: number,
  proposerAddress: string = sourceAddress
): Promise<Transaction> {
  const account = await server.getAccount(sourceAddress);
  const contract = new Contract(getContractId());

  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "propose_deal",
        xdr.ScVal.scvBytes(Buffer.from(hash, "hex")),
        Address.fromString(proposerAddress).toScVal(),
        xdr.ScVal.scvVec(signers.map((s) => Address.fromString(s).toScVal())),
        xdr.ScVal.scvU32(threshold)
      )
    )
    .setTimeout(30)
    .build();
}

/**
 * Builds an unsigned `approve_deal` invocation — records `callerAddress`'s
 * approval of the deal escrow for `hash`. `sourceAddress` pays the fee and
 * signs the envelope; `callerAddress` (defaults to `sourceAddress`) is the
 * on-chain `caller` argument whose `require_auth()` must be satisfied (see
 * `buildProposeDealTransaction`'s doc comment for why those two only
 * genuinely differ when `sourceAddress` can actually authorize on
 * `callerAddress`'s behalf).
 */
export async function buildApproveDealTransaction(
  sourceAddress: string,
  hash: string,
  callerAddress: string = sourceAddress
): Promise<Transaction> {
  const account = await server.getAccount(sourceAddress);
  const contract = new Contract(getContractId());

  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "approve_deal",
        xdr.ScVal.scvBytes(Buffer.from(hash, "hex")),
        Address.fromString(callerAddress).toScVal()
      )
    )
    .setTimeout(30)
    .build();
}

/**
 * Builds an unsigned `execute_deal` invocation — settles the deal escrow
 * for `hash` once enough approvals are in. Same `sourceAddress`/
 * `callerAddress` split as `buildApproveDealTransaction`.
 */
export async function buildExecuteDealTransaction(
  sourceAddress: string,
  hash: string,
  callerAddress: string = sourceAddress
): Promise<Transaction> {
  const account = await server.getAccount(sourceAddress);
  const contract = new Contract(getContractId());

  return new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "execute_deal",
        xdr.ScVal.scvBytes(Buffer.from(hash, "hex")),
        Address.fromString(callerAddress).toScVal()
      )
    )
    .setTimeout(30)
    .build();
}

/**
 * Simulates `tx` against the network and returns a new transaction with
 * the correct resource fee and footprint assembled in — required before a
 * Soroban invocation can be signed and submitted. If the invocation would
 * fail (e.g. the contract panics because this deal already exists), this
 * throws with that real simulation error message.
 */
export async function prepareTransaction(tx: Transaction): Promise<Transaction> {
  return server.prepareTransaction(tx);
}

/**
 * Submits a signed transaction XDR to the Testnet and returns its hash.
 * Throws immediately if the network rejects it outright (bad sequence,
 * insufficient fee, etc.) rather than waiting to poll for confirmation.
 */
export async function submitSignedTransaction(
  signedXdr: string
): Promise<string> {
  const signedTx = TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const result = await server.sendTransaction(signedTx);

  if (result.status === "ERROR") {
    throw new Error(describeTransactionResult(result.errorResult));
  }

  return result.hash;
}

/**
 * Polls the Testnet for `hash` until it reaches a definitive SUCCESS or
 * FAILED status, or polling runs out of attempts. Throws unless it
 * actually reached SUCCESS — callers should treat a thrown error here as
 * "not confirmed," not necessarily "definitely failed."
 */
export async function confirmTransaction(hash: string): Promise<void> {
  const result = await server.pollTransaction(hash, {
    attempts: POLL_ATTEMPTS,
  });

  if (result.status === rpc.Api.GetTransactionStatus.SUCCESS) {
    return;
  }

  if (result.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    throw new Error(
      `Still pending after polling timed out (hash ${hash}). Check a Testnet explorer for its final status.`
    );
  }

  throw new Error(describeTransactionResult(result.resultXdr));
}

/**
 * Read-only lookup of a hash's anchor record via `verify_proof`. Simulates
 * rather than submits — no signature, no fee, no ledger write. Returns
 * `null` if the contract's `Option<ComplianceRecord>` came back empty
 * (never anchored), not just on a network-level failure.
 */
export async function queryVerifyProof(
  hash: string
): Promise<ComplianceRecord | null> {
  const contract = new Contract(getContractId());
  const account = new Account(READ_ONLY_SOURCE, "0");

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("verify_proof", nativeToScVal(hash)))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(simulated.error);
  }
  if (!rpc.Api.isSimulationSuccess(simulated) || !simulated.result) {
    return null;
  }

  const record = scValToNative(simulated.result.retval);
  if (!record) return null;

  return {
    timestampIso: new Date(Number(record.timestamp) * 1000).toISOString(),
    issuer: record.issuer,
  };
}

/**
 * Read-only lookup of a hash's V2 deal escrow state via `get_deal` — the
 * "Read Gap" fix: the Verify Portal now understands `DealState` (a pool
 * of `signers`, who's `approved` so far, the `threshold`, and whether
 * `execute_deal` has run) instead of only the old flat `ComplianceRecord`.
 * Simulates rather than submits — no signature, no fee, no ledger write.
 *
 * Unlike `verify_proof`, the contract's `get_deal` panics
 * (`.expect("Deal does not exist")`) when `hash` was never proposed,
 * rather than returning `None` — so a never-anchored hash surfaces here
 * as the same generic VM-trap simulation error described below, which
 * this function treats as "not found" (`null`) rather than a real
 * failure. Any other simulation error (a genuine network/resource fault)
 * still propagates as a thrown error.
 */
export async function queryDealState(hash: string): Promise<DealState | null> {
  const contract = new Contract(getContractId());
  const account = new Account(READ_ONLY_SOURCE, "0");

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call("get_deal", xdr.ScVal.scvBytes(Buffer.from(hash, "hex")))
    )
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    if (DUPLICATE_HASH_SIGNATURE.test(simulated.error)) {
      return null;
    }
    throw new Error(simulated.error);
  }
  if (!rpc.Api.isSimulationSuccess(simulated) || !simulated.result) {
    return null;
  }

  const state = scValToNative(simulated.result.retval);
  if (!state) return null;

  return {
    signers: state.signers as string[],
    approvals: state.approvals as string[],
    threshold: Number(state.threshold),
    executedAt: Number(state.executed_at),
  };
}

// The release WASM build strips the contract's custom panic strings
// (`contracts/src/lib.rs`'s `panic!(...)`/`.expect(...)` calls, across
// `anchor_proof` and the V2 `propose_deal`/`approve_deal`/`execute_deal`/
// `get_deal` escrow) for binary size, so they never reach the RPC
// diagnostic dump. Confirmed live against Testnet: a real duplicate-hash
// call actually throws `HostError: Error(WasmVm, InvalidAction)` with a
// diagnostic event reading `"VM call trapped: UnreachableCodeReached"` —
// no trace of the original message. `verify_proof` never panics on its
// own (it's read-only over an `Option`), but `get_deal` does — it
// `.expect()`s the deal to exist — so `queryDealState` above relies on
// this exact generic VM-trap signature to distinguish "never proposed"
// from a real network/resource fault.
const DUPLICATE_HASH_SIGNATURE =
  /already\s*anchored|UnreachableCodeReached|VM call trapped|Error\(WasmVm,\s*InvalidAction\)/i;

// Anything else that looks like a network-level or resource failure
// rather than a contract-level trap — these substrings are the ones a
// raw Soroban/RPC error actually contains, not polished text meant
// for a user.
const CONTRACT_FAULT_SIGNATURE =
  /\brevert\b|\btrap\b|panicked|timed? ?out|network|ECONNRESET|fetch failed|TRY_AGAIN_LATER|insufficient|\bgas\b/i;

export const DUPLICATE_HASH_MESSAGE =
  "[REJECTED] CRYPTOGRAPHIC ATTESTATION COLLISION // PROOF ALREADY EXISTS ON LEDGER. STATE IMMUTABILITY PRESERVED.";

export const RPC_TRANSIT_MESSAGE =
  "[FAILURE] INSUFFICIENT GAS OR NETWORK TIMEOUT // SOROBAN RPC TRANSIT INTERRUPTED.";

/**
 * Translates a raw Soroban/WASM error — a host trap, RPC diagnostic
 * dump, or network timeout — into a clean, monochrome terminal alert
 * instead of leaking a raw stack trace to the UI. Returns `null` when
 * the error doesn't match a known contract/network failure signature,
 * so the caller can fall back to its own generic message.
 */
export function translateContractError(err: unknown): string | null {
  const message = err instanceof Error ? err.message : String(err);

  if (DUPLICATE_HASH_SIGNATURE.test(message)) {
    return DUPLICATE_HASH_MESSAGE;
  }
  if (CONTRACT_FAULT_SIGNATURE.test(message)) {
    return RPC_TRANSIT_MESSAGE;
  }
  return null;
}

function describeTransactionResult(resultXdr?: xdr.TransactionResult): string {
  if (!resultXdr) return "Unknown transaction result.";
  try {
    return `Network rejected the transaction: ${resultXdr.result().switch().name}`;
  } catch {
    return "Unknown transaction result.";
  }
}
