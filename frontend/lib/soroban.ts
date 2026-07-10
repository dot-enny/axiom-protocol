import { Buffer } from "buffer";
import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Networks,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
} from "@stellar/stellar-sdk";

/**
 * Placeholder contract identifier: a syntactically valid strkey (correct
 * checksum, so Contract/TransactionBuilder can encode it) built from an
 * all-zero buffer. It doesn't correspond to any deployed contract — the
 * real Axiom compliance contract (contracts/src/lib.rs) hasn't been
 * deployed to any network yet.
 */
const PLACEHOLDER_CONTRACT_ID = StrKey.encodeContract(Buffer.alloc(32));

/**
 * Builds (but does not submit) an unsigned Soroban `anchor_proof`
 * invocation for the given document hash, ready to hand to a wallet for
 * signing. The source account is constructed locally with a placeholder
 * sequence number rather than fetched from the network, since nothing
 * built here is actually submitted anywhere.
 */
export function buildAnchorProofTransaction(
  sourceAddress: string,
  hash: string
): string {
  const account = new Account(sourceAddress, "0");
  const contract = new Contract(PLACEHOLDER_CONTRACT_ID);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
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

  return transaction.toXDR();
}
