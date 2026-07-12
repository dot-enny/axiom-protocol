import {
  Address,
  Contract,
  BASE_FEE,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  xdr,
  type Transaction,
} from "@stellar/stellar-sdk";

const RPC_URL = "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const POLL_ATTEMPTS = 30;

const server = new rpc.Server(RPC_URL);

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
 */
export async function buildAnchorProofTransaction(
  sourceAddress: string,
  hash: string
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
        Address.fromString(sourceAddress).toScVal()
      )
    )
    .setTimeout(30)
    .build();
}

/**
 * Simulates `tx` against the network and returns a new transaction with
 * the correct resource fee and footprint assembled in — required before a
 * Soroban invocation can be signed and submitted. If the invocation would
 * fail (e.g. the contract panics because this hash is already anchored),
 * this throws with that real simulation error message.
 */
export async function prepareAnchorProofTransaction(
  tx: Transaction
): Promise<Transaction> {
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

function describeTransactionResult(resultXdr?: xdr.TransactionResult): string {
  if (!resultXdr) return "Unknown transaction result.";
  try {
    return `Network rejected the transaction: ${resultXdr.result().switch().name}`;
  } catch {
    return "Unknown transaction result.";
  }
}
