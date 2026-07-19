#![no_std]

//! Axiom Protocol compliance-anchor contract.
//!
//! Anchors a client-computed document hash to the ledger alongside the
//! issuing address and a ledger timestamp. Anchors are write-once: a
//! hash that has already been anchored can be verified but never
//! silently overwritten.

use soroban_sdk::{contract, contractimpl, contracttype, Address, BytesN, Env, String, Vec};

#[cfg(test)]
mod test;

/// Roughly one day of ledgers, assuming a ~5 second average ledger
/// close time (86,400s / 5s).
const DAY_IN_LEDGERS: u32 = 17_280;

/// How far each anchor's TTL is extended when it's written or bumped,
/// in ledgers (~30 days). Compliance proofs need to survive for the
/// long term, not the storage minimum.
const TTL_EXTEND_TO: u32 = 30 * DAY_IN_LEDGERS;

/// Extend once the remaining TTL drops below this many ledgers
/// (~1 day of headroom before expiry).
const TTL_THRESHOLD: u32 = TTL_EXTEND_TO - DAY_IN_LEDGERS;

/// A single anchored compliance proof.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ComplianceRecord {
    /// Ledger timestamp (Unix seconds) at the time the proof was anchored.
    pub timestamp: u64,
    /// The address that authorized this anchor.
    pub issuer: Address,
}

/// The on-chain state of a dynamic m-of-n deal escrow: a pool of
/// authorized `signers`, the subset who have actually `approved` so
/// far, and the `threshold` of approvals required before it can
/// execute.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DealState {
    /// The total pool of addresses authorized to approve this deal.
    pub signers: Vec<Address>,
    /// The subset of `signers` who have approved so far.
    pub approvals: Vec<Address>,
    /// The minimum number of approvals required to execute.
    pub threshold: u32,
    /// 0 while pending; set to the ledger timestamp once `threshold`
    /// approvals are in and `execute_deal` has run.
    pub executed_at: u64,
}

/// Storage key namespace for deal escrow state, kept separate from
/// the flat `ComplianceRecord` proofs above (which are keyed directly
/// by their `String` hash) so the two features can never collide even
/// if a document hash and a deal hash happen to coincide.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum DataKey {
    Deal(BytesN<32>),
}

#[contract]
pub struct AxiomContract;

#[contractimpl]
impl AxiomContract {
    /// Anchors `hash` on the ledger, attributed to `issuer`.
    ///
    /// Requires `issuer`'s authorization. Panics if `hash` has already
    /// been anchored, since proofs are write-once and must never be
    /// silently overwritten by a later call.
    pub fn anchor_proof(env: Env, hash: String, issuer: Address) {
        issuer.require_auth();

        if env.storage().persistent().has(&hash) {
            panic!("hash already anchored");
        }

        let record = ComplianceRecord {
            timestamp: env.ledger().timestamp(),
            issuer,
        };
        env.storage().persistent().set(&hash, &record);
        env.storage()
            .persistent()
            .extend_ttl(&hash, TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    /// Returns the anchored record for `hash`, or `None` if `hash`
    /// has never been anchored.
    pub fn verify_proof(env: Env, hash: String) -> Option<ComplianceRecord> {
        env.storage().persistent().get(&hash)
    }

    /// Proposes a new m-of-n deal escrow for `hash`, naming the pool
    /// of `signers` authorized to approve it and the `threshold`
    /// number of approvals required before `execute_deal` can run.
    ///
    /// Requires `proposer`'s authorization. Panics if `threshold` is
    /// zero, if `threshold` exceeds the number of `signers`, or if a
    /// deal already exists for `hash` — a proposal must never
    /// silently overwrite an existing one's approval state.
    pub fn propose_deal(
        env: Env,
        hash: BytesN<32>,
        proposer: Address,
        signers: Vec<Address>,
        threshold: u32,
    ) {
        proposer.require_auth();

        if threshold == 0 {
            panic!("Threshold must be greater than zero");
        }
        if threshold > signers.len() {
            panic!("Threshold cannot exceed the number of signers");
        }

        let key = DataKey::Deal(hash);
        if env.storage().persistent().has(&key) {
            panic!("Deal already exists");
        }

        let state = DealState {
            signers,
            approvals: Vec::new(&env),
            threshold,
            executed_at: 0,
        };
        env.storage().persistent().set(&key, &state);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    /// Records `caller`'s approval of the deal for `hash`. `caller`
    /// must be one of the deal's authorized `signers`.
    ///
    /// Requires `caller`'s authorization. Panics if the deal doesn't
    /// exist, has already executed, `caller` isn't an authorized
    /// signer, or `caller` has already approved (Sybil protection —
    /// one address can't count as two approvals).
    pub fn approve_deal(env: Env, hash: BytesN<32>, caller: Address) {
        caller.require_auth();

        let key = DataKey::Deal(hash);
        let mut state: DealState = env.storage().persistent().get(&key).expect("Deal does not exist");

        if state.executed_at != 0 {
            panic!("Deal already executed");
        }
        if !state.signers.contains(&caller) {
            panic!("Signer is not a party to this deal");
        }
        if state.approvals.contains(&caller) {
            panic!("Signer has already approved this deal");
        }

        state.approvals.push_back(caller);
        env.storage().persistent().set(&key, &state);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    /// Executes the deal for `hash` once at least `threshold`
    /// approvals are in, stamping `executed_at` with the current
    /// ledger timestamp.
    ///
    /// Requires `caller`'s authorization. Panics if the deal doesn't
    /// exist, has already executed, or the approval count is still
    /// below `threshold`.
    pub fn execute_deal(env: Env, hash: BytesN<32>, caller: Address) {
        caller.require_auth();

        let key = DataKey::Deal(hash);
        let mut state: DealState = env.storage().persistent().get(&key).expect("Deal does not exist");

        if state.executed_at != 0 {
            panic!("Deal already executed");
        }
        if state.approvals.len() < state.threshold {
            panic!("Deal is missing required approvals");
        }

        state.executed_at = env.ledger().timestamp();
        env.storage().persistent().set(&key, &state);
        env.storage()
            .persistent()
            .extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND_TO);
    }

    /// Returns the current state of the deal escrow for `hash`.
    /// Panics if no deal has ever been proposed for it.
    pub fn get_deal(env: Env, hash: BytesN<32>) -> DealState {
        let key = DataKey::Deal(hash);
        env.storage().persistent().get(&key).expect("Deal does not exist")
    }
}
