#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, BytesN, Env,
};

use crate::{AxiomContract, AxiomContractClient};

/// Registers a fresh contract instance with three mock parties and a
/// mock 32-byte deal hash. `mock_all_auths` lets every `require_auth()`
/// call in the contract succeed without real signatures — these tests
/// are about the contract's own state/panic logic, not Soroban's
/// signature verification.
fn setup<'a>() -> (Env, AxiomContractClient<'a>, Address, Address, Address, BytesN<32>) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AxiomContract, ());
    let client = AxiomContractClient::new(&env, &contract_id);

    let issuer = Address::generate(&env);
    let auditor = Address::generate(&env);
    let counterparty = Address::generate(&env);
    let hash = BytesN::<32>::from_array(&env, &[1u8; 32]);

    (env, client, issuer, auditor, counterparty, hash)
}

#[test]
fn test_successful_deal_execution() {
    let (env, client, issuer, auditor, counterparty, hash) = setup();

    // Step 1: the issuer proposes the deal.
    client.propose_deal(&hash, &issuer, &auditor, &counterparty);
    let state = client.get_deal(&hash);
    assert_eq!(state.executed_at, 0);
    assert!(!state.auditor_approved);
    assert!(!state.counterparty_approved);

    // Step 2: the auditor approves.
    client.approve_deal(&hash, &auditor);
    let state = client.get_deal(&hash);
    assert!(state.auditor_approved);
    assert!(!state.counterparty_approved);

    // Step 3: the counterparty approves.
    client.approve_deal(&hash, &counterparty);
    let state = client.get_deal(&hash);
    assert!(state.auditor_approved);
    assert!(state.counterparty_approved);

    // Step 4: execute now that both approvals are in.
    env.ledger().set_timestamp(1_700_000_000);
    client.execute_deal(&hash, &issuer);
    let state = client.get_deal(&hash);
    assert!(state.executed_at > 0);
}

#[test]
#[should_panic(expected = "Signer is not a party to this deal")]
fn test_unauthorized_approval() {
    let (env, client, issuer, auditor, counterparty, hash) = setup();
    client.propose_deal(&hash, &issuer, &auditor, &counterparty);

    let stranger = Address::generate(&env);
    client.approve_deal(&hash, &stranger);
}

#[test]
#[should_panic(expected = "Deal is missing a required approval")]
fn test_premature_execution() {
    let (_env, client, issuer, auditor, counterparty, hash) = setup();
    client.propose_deal(&hash, &issuer, &auditor, &counterparty);

    // Only the auditor approves — the counterparty never does.
    client.approve_deal(&hash, &auditor);
    client.execute_deal(&hash, &issuer);
}

#[test]
#[should_panic(expected = "Deal already exists")]
fn test_duplicate_proposal() {
    let (_env, client, issuer, auditor, counterparty, hash) = setup();
    client.propose_deal(&hash, &issuer, &auditor, &counterparty);
    // Proposing the exact same hash again must not silently overwrite
    // the first proposal's approval state.
    client.propose_deal(&hash, &issuer, &auditor, &counterparty);
}
