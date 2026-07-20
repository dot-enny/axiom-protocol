"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { signTransaction } from "@stellar/freighter-api";
import { Networks, type Transaction } from "@stellar/stellar-sdk";
import { Button } from "@/components/ui/button";
import { WalletModal } from "@/components/WalletModal";
import { AuditTrail } from "@/components/verify/audit-trail";
import { useWallet } from "@/components/dashboard/wallet-context";
import {
  buildApproveDealTransaction,
  buildExecuteDealTransaction,
  confirmTransaction,
  prepareTransaction,
  queryDealState,
  submitSignedTransaction,
  translateContractError,
  type DealState,
} from "@/lib/soroban";
import { getRecords } from "@/lib/useLedgerStore";

type QueryState = "idle" | "loading" | "found" | "rejected";

const HASH_PATTERN = /^[a-f0-9]{64}$/i;

// Best-effort degrade path for when the chain read itself fails
// (network error) — the local ledger only ever knows about deals this
// browser proposed, and doesn't track approvals/execution, so this is
// necessarily an approximation: it reports the deal as still pending
// with no approvals recorded, never as executed.
function findLocalRecord(hash: string): DealState | null {
  const local = getRecords().find((r) => r.hash === hash);
  if (!local) return null;
  return {
    signers: [local.issuer],
    approvals: [],
    threshold: local.threshold,
    executedAt: 0,
  };
}

/** Signs `unsignedTx` via Freighter, submits it, and waits for confirmation. */
async function signAndSubmit(
  unsignedTx: Transaction,
  signerAddress: string
): Promise<string> {
  const preparedTx = await prepareTransaction(unsignedTx);
  const signResult = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: Networks.TESTNET,
    address: signerAddress,
  });
  if (signResult.error) {
    throw new Error(signResult.error.message);
  }
  const txHash = await submitSignedTransaction(signResult.signedTxXdr);
  await confirmTransaction(txHash);
  return txHash;
}

export function VerifyPanel() {
  const searchParams = useSearchParams();
  const { address } = useWallet();
  const [hashInput, setHashInput] = useState("");
  const [queryState, setQueryState] = useState<QueryState>("idle");
  const [dealState, setDealState] = useState<DealState | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [formatWarning, setFormatWarning] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approveMessage, setApproveMessage] = useState<string | null>(null);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  // Set when "[ APPROVE DEAL ]" is clicked with no wallet connected yet,
  // so approval resumes automatically once the modal's connect succeeds,
  // mirroring the dashboard's own pendingAnchor pattern.
  const [pendingApprove, setPendingApprove] = useState(false);
  const hasAutoRun = useRef(false);
  const lastQueriedHash = useRef<string | null>(null);

  async function handleVerify(rawHash: string) {
    const hash = rawHash.trim().toLowerCase();

    if (!HASH_PATTERN.test(hash)) {
      setFormatWarning(true);
      return;
    }
    setFormatWarning(false);

    setQueryState("loading");
    setDealState(null);
    setDetail(null);
    setApproveMessage(null);
    lastQueriedHash.current = hash;

    try {
      const result = (await queryDealState(hash)) ?? findLocalRecord(hash);
      if (result) {
        setDealState(result);
        setQueryState("found");
      } else {
        setQueryState("rejected");
      }
    } catch (err) {
      const local = findLocalRecord(hash);
      if (local) {
        setDealState(local);
        setQueryState("found");
        return;
      }
      setDetail(err instanceof Error ? err.message : "Unknown error");
      setQueryState("rejected");
    }
  }

  // Approving is a real on-chain action: it must be signed by the
  // approver's own wallet, since Soroban's require_auth() can only ever
  // be satisfied by that address's own signature — there is no server
  // key that can sign on a third party's behalf. Every step here mirrors
  // the dashboard's own propose_deal flow for that reason.
  const runApprove = useCallback(async (signerAddress: string, hash: string) => {
    setIsApproving(true);
    setApproveMessage(null);

    try {
      const approveUnsigned = await buildApproveDealTransaction(
        signerAddress,
        hash
      );
      await signAndSubmit(approveUnsigned, signerAddress);

      const deal = await queryDealState(hash);
      let executed = false;
      if (deal && deal.executedAt === 0 && deal.approvals.length >= deal.threshold) {
        const executeUnsigned = await buildExecuteDealTransaction(
          signerAddress,
          hash
        );
        await signAndSubmit(executeUnsigned, signerAddress);
        executed = true;
      }

      // handleVerify resets approveMessage as part of a fresh query, so
      // it must run before this success message is set, not after —
      // otherwise the message is wiped the instant it's shown.
      await handleVerify(hash);
      setApproveMessage(
        executed
          ? "[SOROBAN] Approval recorded — threshold met, deal executed."
          : "[SOROBAN] Approval recorded. Awaiting further signatures."
      );
    } catch (err) {
      const translated = translateContractError(err);
      setApproveMessage(
        translated ??
          `[ERROR] ${err instanceof Error ? err.message : "Unknown error"}`
      );
    } finally {
      setIsApproving(false);
    }
  }, []);

  function handleApproveClick() {
    const hash = lastQueriedHash.current;
    if (!hash || isApproving) return;

    if (!address) {
      setPendingApprove(true);
      setIsWalletModalOpen(true);
      return;
    }

    void runApprove(address, hash);
  }

  // The wallet modal closes itself on a successful connection — once
  // that happens, resume the approval the user actually asked for.
  useEffect(() => {
    const hash = lastQueriedHash.current;
    if (!pendingApprove || !address || !hash) return;
    setPendingApprove(false);
    void runApprove(address, hash);
  }, [pendingApprove, address, runApprove]);

  // Deep-link support: ?hash=... populates and auto-queries on first mount only,
  // so it doesn't re-fire if the user edits the input afterward.
  useEffect(() => {
    if (hasAutoRun.current) return;
    const urlHash = searchParams.get("hash");
    if (!urlHash) return;
    hasAutoRun.current = true;
    const normalized = urlHash.trim().toLowerCase();
    setHashInput(normalized);
    void handleVerify(normalized);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void handleVerify(hashInput);
  }

  const isLoading = queryState === "loading";

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label
          htmlFor="hash"
          className="font-mono text-xs uppercase tracking-widest"
        >
          Document Hash (SHA-256)
        </label>
        <input
          id="hash"
          value={hashInput}
          onChange={(e) => {
            setHashInput(e.target.value);
            setFormatWarning(false);
          }}
          placeholder="0000000000000000000000000000000000000000000000000000000000000000"
          spellCheck={false}
          autoComplete="off"
          className="rounded-none border-2 border-black bg-white px-4 py-4 font-mono text-sm text-black placeholder:text-black/40 focus:outline-none focus:ring-0"
        />
        {formatWarning && (
          <p className="font-mono text-xs uppercase tracking-widest text-black">
            Expected a 64-character hexadecimal SHA-256 hash.
          </p>
        )}

        <Button type="submit" disabled={isLoading} className="px-6 py-4 text-xs">
          {isLoading ? "Querying..." : "Query Ledger State"}
        </Button>
      </form>

      <div className="mt-8">
        {queryState === "loading" && (
          <p className="font-mono text-xs uppercase tracking-widest">
            [NETWORK] Scanning blocks...
          </p>
        )}

        {queryState === "found" && dealState && dealState.executedAt > 0 && (
          <div className="rounded-none border-2 border-black bg-black p-6 text-white">
            <p className="font-mono text-2xl font-bold uppercase tracking-tight sm:text-3xl">
              {"[ VERIFIED & EXECUTED ]"}
            </p>
            <div className="mt-6 flex flex-col gap-4 border-t border-white pt-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest">
                  Authorized Signers ({dealState.signers.length})
                </p>
                <ul className="mt-1 flex flex-col gap-1">
                  {dealState.signers.map((signer) => (
                    <li key={signer} className="break-all font-mono text-sm">
                      {signer}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-widest">
                  UTC Timestamp of Execution
                </p>
                <p className="mt-1 font-mono text-sm">
                  {new Date(dealState.executedAt * 1000).toISOString()}
                </p>
              </div>
            </div>

            <AuditTrail
              timestampIso={new Date(dealState.executedAt * 1000).toISOString()}
            />
          </div>
        )}

        {queryState === "found" && dealState && dealState.executedAt === 0 && (
          <div className="rounded-none border-4 border-black bg-white p-6 text-black">
            <p className="font-mono text-2xl font-bold uppercase tracking-tight sm:text-3xl">
              {`[ PENDING ESCROW: ${dealState.approvals.length} / ${dealState.threshold} SIGNATURES ]`}
            </p>
            <div className="mt-6 border-t-2 border-black pt-6">
              <p className="font-mono text-xs uppercase tracking-widest">
                Authorized Signers
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {dealState.signers.map((signer) => (
                  <li key={signer} className="font-mono text-sm">
                    <span className="mr-2 font-bold">
                      {dealState.approvals.includes(signer) ? "[X]" : "[ ]"}
                    </span>
                    <span className="break-all">{signer}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="mt-4 font-mono text-xs uppercase tracking-widest">
              Approving requires your own connected wallet — only your own
              signature can authorize your approval on-chain.
            </p>

            <Button
              onClick={handleApproveClick}
              disabled={isApproving}
              className="mt-4 w-full py-5 text-sm"
            >
              {isApproving
                ? "Submitting Approval..."
                : address
                  ? "[ APPROVE DEAL ]"
                  : "[ CONNECT WALLET TO APPROVE ]"}
            </Button>

            {approveMessage && (
              <p className="mt-4 font-mono text-xs uppercase tracking-widest">
                {approveMessage}
              </p>
            )}
          </div>
        )}

        {queryState === "rejected" && (
          <div className="rounded-none border-2 border-black p-6">
            <p className="font-mono text-2xl font-bold uppercase tracking-tight sm:text-3xl">
              Rejected: No Match On Ledger
            </p>
            {detail && (
              <p className="mt-4 font-mono text-xs">
                [ERROR] {detail}
              </p>
            )}
          </div>
        )}
      </div>

      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => {
          setIsWalletModalOpen(false);
          if (!address) setPendingApprove(false);
        }}
      />
    </div>
  );
}
