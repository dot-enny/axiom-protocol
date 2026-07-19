#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    vec, Address, BytesN, Env,
};

use crate::{AxiomContract, AxiomContractClient};

/// Registers a fresh contract instance and a mock 32-byte deal hash.
/// `mock_all_auths` lets every `require_auth()` call succeed without
/// real signatures — these tests are about the contract's own
/// threshold/state logic, not Soroban's signature verification.
fn setup<'a>() -> (Env, AxiomContractClient<'a>, BytesN<32>) {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register(AxiomContract, ());
    let client = AxiomContractClient::new(&env, &contract_id);
    let hash = BytesN::<32>::from_array(&env, &[1u8; 32]);

    (env, client, hash)
}

#[test]
fn test_1_of_1_solo_execution() {
    let (env, client, hash) = setup();
    let creator = Address::generate(&env);

    client.propose_deal(&hash, &creator, &vec![&env, creator.clone()], &1);
    client.approve_deal(&hash, &creator);

    env.ledger().set_timestamp(1_700_000_000);
    client.execute_deal(&hash, &creator);

    let state = client.get_deal(&hash);
    assert!(state.executed_at > 0);
}

#[test]
fn test_2_of_2_bilateral_execution() {
    let (env, client, hash) = setup();
    let founder_a = Address::generate(&env);
    let founder_b = Address::generate(&env);
    let signers = vec![&env, founder_a.clone(), founder_b.clone()];

    client.propose_deal(&hash, &founder_a, &signers, &2);
    client.approve_deal(&hash, &founder_a);
    client.approve_deal(&hash, &founder_b);

    env.ledger().set_timestamp(1_700_000_000);
    client.execute_deal(&hash, &founder_a);

    let state = client.get_deal(&hash);
    assert!(state.executed_at > 0);
}

#[test]
fn test_2_of_3_threshold_execution() {
    let (env, client, hash) = setup();
    let firm = Address::generate(&env);
    let buyer = Address::generate(&env);
    let auditor = Address::generate(&env);
    let signers = vec![&env, firm.clone(), buyer.clone(), auditor.clone()];

    client.propose_deal(&hash, &firm, &signers, &2);
    client.approve_deal(&hash, &firm);
    client.approve_deal(&hash, &auditor);

    // The buyer never approves — 2-of-3 must still be enough to execute.
    env.ledger().set_timestamp(1_700_000_000);
    client.execute_deal(&hash, &firm);

    let state = client.get_deal(&hash);
    assert!(state.executed_at > 0);
}

#[test]
#[should_panic(expected = "Unauthorized")]
fn test_unauthorized_approval_panics() {
    let (env, client, hash) = setup();
    let creator = Address::generate(&env);
    let stranger = Address::generate(&env);

    client.propose_deal(&hash, &creator, &vec![&env, creator.clone()], &1);
    client.approve_deal(&hash, &stranger);
}

#[test]
#[should_panic(expected = "Already signed")]
fn test_duplicate_approval_panics() {
    let (env, client, hash) = setup();
    let creator = Address::generate(&env);

    client.propose_deal(&hash, &creator, &vec![&env, creator.clone()], &1);
    client.approve_deal(&hash, &creator);
    client.approve_deal(&hash, &creator);
}

#[test]
#[should_panic(expected = "Not fully approved")]
fn test_premature_execution_panics() {
    let (env, client, hash) = setup();
    let founder_a = Address::generate(&env);
    let founder_b = Address::generate(&env);
    let signers = vec![&env, founder_a.clone(), founder_b.clone()];

    client.propose_deal(&hash, &founder_a, &signers, &2);
    client.approve_deal(&hash, &founder_a);
    // founder_b never approves — only 1 of the required 2 is in.
    client.execute_deal(&hash, &founder_a);
}

#[test]
#[should_panic(expected = "Invalid threshold")]
fn test_invalid_threshold_panics() {
    let (env, client, hash) = setup();
    let firm = Address::generate(&env);
    let buyer = Address::generate(&env);
    let signers = vec![&env, firm.clone(), buyer.clone()];

    // Threshold of 3 exceeds the 2-address signer pool.
    client.propose_deal(&hash, &firm, &signers, &3);
}
