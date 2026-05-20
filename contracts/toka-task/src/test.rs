#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::Address as _, Env, Address, String};

#[test]
fn test_full_task_lifecycle() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TokaContract);
    let client = TokaContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let earner = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(admin.clone());
    let token = sac.address();
    let sac_client = token::StellarAssetClient::new(&env, &token);
    sac_client.mint(&admin, &100_000_000i128);

    // Initialize
    client.initialize(&admin, &token, &1_000_000_000i128);

    // Create task
    let task_id = client.create_task(
        &String::from_str(&env, "Sweep the floor"),
        &50_000_000i128,  // 5 TOKA
        &earner,
    );
    assert_eq!(task_id, 1);

    // Verify pending state
    let task = client.get_task(&1u64);
    assert_eq!(task.status, TaskStatus::Pending);

    // Submit task
    client.submit_task(
        &1u64,
        &String::from_str(&env, "QmTestCID123"),
    );
    let task = client.get_task(&1u64);
    assert_eq!(task.status, TaskStatus::Submitted);

    // Approve task
    client.approve_task(&1u64);
    let task = client.get_task(&1u64);
    assert_eq!(task.status, TaskStatus::Approved);
}

#[test]
#[should_panic(expected = "task is not in pending state")]
fn test_cannot_submit_approved_task() {
    let env = Env::default();
    env.mock_all_auths();

    let contract_id = env.register_contract(None, TokaContract);
    let client = TokaContractClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let earner = Address::generate(&env);
    let token = env.register_stellar_asset_contract_v2(admin.clone()).address();

    client.initialize(&admin, &token, &1_000_000_000i128);

    client.create_task(
        &String::from_str(&env, "Sweep the floor"),
        &50_000_000i128,
        &earner,
    );

    client.submit_task(&1u64, &String::from_str(&env, "QmTestCID123"));
    
    // Trying to submit again should panic
    client.submit_task(&1u64, &String::from_str(&env, "QmTestCID456"));
}
