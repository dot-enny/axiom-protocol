#![no_std]

//! Axiom Protocol compliance-anchor contract.
//!
//! Anchors a client-computed document hash to the ledger alongside the
//! issuing address and a ledger timestamp. Anchors are write-once: a
//! hash that has already been anchored can be verified but never
//! silently overwritten.

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String};

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
}
