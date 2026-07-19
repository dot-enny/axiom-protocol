#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    vec, Address, BytesN, Env,
};

use crate::{AxiomContract, AxiomContractClient};

/// Registers a fresh contract instance with three mock signers and a
/// mock 32-byte deal hash. `mock_all_auths` lets every `require_auth()`
/// call in the contract succeed without real signatures — these tests
/// are about the contract's own state/panic logic, not Soroban's
/// signature verification.
fn setup<'a>() -> (Env, AxiomContractClient<'a>, Address, Address, Address, Address, BytesN<32>) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AxiomContract, ());
    let client = AxiomContractClient::new(&env, &contract_id);

    let proposer = Address::generate(&env);
    let signer_a = Address::generate(&env);
    let signer_b = Address::generate(&env);
    let signer_c = Address::generate(&env);
    let hash = BytesN::<32>::from_array(&env, &[1u8; 32]);

    (env, client, proposer, signer_a, signer_b, signer_c, hash)
}

#[test]
fn test_successful_deal_execution() {
    let (env, client, proposer, signer_a, signer_b, signer_c, hash) = setup();
    let signers = vec![&env, signer_a.clone(), signer_b.clone(), signer_c.clone()];

    // Step 1: the proposer opens a 2-of-3 deal.
    client.propose_deal(&hash, &proposer, &signers, &2);
    let state = client.get_deal(&hash);
    assert_eq!(state.executed_at, 0);
    assert_eq!(state.threshold, 2);
    assert_eq!(state.approvals.len(), 0);

    // Step 2: one signer approves — not enough yet.
    client.approve_deal(&hash, &signer_a);
    let state = client.get_deal(&hash);
    assert_eq!(state.approvals.len(), 1);

    // Step 3: a second signer approves — threshold met.
    client.approve_deal(&hash, &signer_b);
    let state = client.get_deal(&hash);
    assert_eq!(state.approvals.len(), 2);

    // Step 4: execute now that the threshold is satisfied.
    env.ledger().set_timestamp(1_700_000_000);
    client.execute_deal(&hash, &proposer);
    let state = client.get_deal(&hash);
    assert!(state.executed_at > 0);
}

#[test]
#[should_panic(expected = "Signer is not a party to this deal")]
fn test_unauthorized_approval() {
    let (env, client, proposer, signer_a, signer_b, _signer_c, hash) = setup();
    let signers = vec![&env, signer_a.clone(), signer_b.clone()];
    client.propose_deal(&hash, &proposer, &signers, &2);

    let stranger = Address::generate(&env);
    client.approve_deal(&hash, &stranger);
}

#[test]
#[should_panic(expected = "Signer has already approved this deal")]
fn test_duplicate_approval() {
    let (env, client, proposer, signer_a, signer_b, _signer_c, hash) = setup();
    let signers = vec![&env, signer_a.clone(), signer_b.clone()];
    client.propose_deal(&hash, &proposer, &signers, &2);

    client.approve_deal(&hash, &signer_a);
    client.approve_deal(&hash, &signer_a);
}

#[test]
#[should_panic(expected = "Deal is missing required approvals")]
fn test_premature_execution() {
    let (_env, client, proposer, signer_a, signer_b, signer_c, hash) = setup();
    let signers = vec![&_env, signer_a.clone(), signer_b.clone(), signer_c.clone()];
    client.propose_deal(&hash, &proposer, &signers, &2);

    // Only one of the required two signers approves.
    client.approve_deal(&hash, &signer_a);
    client.execute_deal(&hash, &proposer);
}

#[test]
#[should_panic(expected = "Deal already exists")]
fn test_duplicate_proposal() {
    let (env, client, proposer, signer_a, signer_b, _signer_c, hash) = setup();
    let signers = vec![&env, signer_a.clone(), signer_b.clone()];
    client.propose_deal(&hash, &proposer, &signers, &2);
    // Proposing the exact same hash again must not silently overwrite
    // the first proposal's approval state.
    client.propose_deal(&hash, &proposer, &signers, &2);
}

#[test]
#[should_panic(expected = "Threshold cannot exceed the number of signers")]
fn test_threshold_exceeds_signers() {
    let (env, client, proposer, signer_a, signer_b, _signer_c, hash) = setup();
    let signers = vec![&env, signer_a.clone(), signer_b.clone()];
    client.propose_deal(&hash, &proposer, &signers, &3);
}

#[test]
#[should_panic(expected = "Threshold must be greater than zero")]
fn test_zero_threshold() {
    let (env, client, proposer, signer_a, signer_b, _signer_c, hash) = setup();
    let signers = vec![&env, signer_a.clone(), signer_b.clone()];
    client.propose_deal(&hash, &proposer, &signers, &0);
}
