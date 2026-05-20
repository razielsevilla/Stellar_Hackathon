# ⚙️ SMART_CONTRACTS.md — Soroban Contract Logic

## Overview

The Toka smart contract is written in **Rust** using the **Soroban SDK**. It governs the core Task-to-Reward loop entirely on-chain: task registration, submission, approval, and token transfer.

---

## Setup: Soroban Development Environment

```bash
# 1. Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Add WebAssembly target
rustup target add wasm32-unknown-unknown

# 3. Install Stellar CLI (includes Soroban)
cargo install --locked stellar-cli --features opt

# 4. Verify installation
stellar --version

# 5. Configure testnet
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

# 6. Generate and fund a testnet account
stellar keys generate --global deployer --network testnet
stellar keys fund deployer --network testnet
```

---

## Contract: `toka-task`

### Cargo.toml

```toml
[package]
name = "toka-task"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
soroban-sdk = { version = "21.0.0", features = ["alloc"] }

[dev-dependencies]
soroban-sdk = { version = "21.0.0", features = ["testutils"] }

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true
```

---

## Full Contract Code: `src/lib.rs`

```rust
#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, contractclient,
    token, symbol_short,
    Address, Bytes, Env, String, Symbol,
};

// ─── Data Types ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum TaskStatus {
    Pending,    // Created by anchor, waiting for earner
    Submitted,  // Earner marked done + uploaded proof
    Approved,   // Anchor approved, payment sent
    Rejected,   // Anchor rejected, back to Pending
}

#[contracttype]
#[derive(Clone)]
pub struct Task {
    pub id: u64,
    pub title: String,
    pub reward: i128,           // Amount in TOKA stroops (1 TOKA = 10^7 stroops)
    pub earner: Address,        // Child's Stellar address
    pub status: TaskStatus,
    pub proof_cid: Option<String>, // IPFS CID of proof photo
    pub created_at: u64,
    pub completed_at: Option<u64>,
}

#[contracttype]
pub enum DataKey {
    Admin,          // Anchor's address
    VaultToken,     // TOKA token contract address
    TaskCount,      // Total tasks ever created (used as ID)
    Task(u64),      // Task by ID
    MaxReward,      // Max reward per single task (safety cap)
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct TokaContract;

#[contractimpl]
impl TokaContract {

    /// Initialize the contract. Called once by the Anchor on deployment.
    /// - admin: the parent/OFW's Stellar address (controls approvals)
    /// - token: the TOKA token contract address
    /// - max_reward: maximum TOKA reward allowed per task (safety cap)
    pub fn initialize(
        env: Env,
        admin: Address,
        token: Address,
        max_reward: i128,
    ) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::VaultToken, &token);
        env.storage().instance().set(&DataKey::MaxReward, &max_reward);
        env.storage().instance().set(&DataKey::TaskCount, &0u64);
    }

    /// Create a new task. Only callable by the admin (Anchor).
    /// Returns the new task's ID.
    pub fn create_task(
        env: Env,
        title: String,
        reward: i128,
        earner: Address,
    ) -> u64 {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        // Safety: reward cannot exceed max cap
        let max_reward: i128 = env.storage().instance().get(&DataKey::MaxReward).unwrap();
        if reward > max_reward || reward <= 0 {
            panic!("reward out of bounds");
        }

        let task_count: u64 = env.storage().instance().get(&DataKey::TaskCount).unwrap();
        let task_id = task_count + 1;

        let task = Task {
            id: task_id,
            title,
            reward,
            earner,
            status: TaskStatus::Pending,
            proof_cid: None,
            created_at: env.ledger().timestamp(),
            completed_at: None,
        };

        env.storage().persistent().set(&DataKey::Task(task_id), &task);
        env.storage().instance().set(&DataKey::TaskCount, &task_id);

        // Emit event
        env.events().publish(
            (symbol_short!("created"), task_id),
            reward,
        );

        task_id
    }

    /// Called by the Earner (child) to submit proof of task completion.
    /// - task_id: which task they're completing
    /// - proof_cid: IPFS CID of the proof photo
    pub fn submit_task(env: Env, task_id: u64, proof_cid: String) {
        let mut task: Task = env.storage().persistent()
            .get(&DataKey::Task(task_id))
            .expect("task not found");

        // Only the assigned earner can submit
        task.earner.require_auth();

        if task.status != TaskStatus::Pending {
            panic!("task is not in pending state");
        }

        task.status = TaskStatus::Submitted;
        task.proof_cid = Some(proof_cid);
        task.completed_at = Some(env.ledger().timestamp());

        env.storage().persistent().set(&DataKey::Task(task_id), &task);

        env.events().publish(
            (symbol_short!("submittd"), task_id),
            task.earner.clone(),
        );
    }

    /// Called by the Anchor to approve a submission and trigger payment.
    /// This is the core action: it executes the token transfer.
    pub fn approve_task(env: Env, task_id: u64) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut task: Task = env.storage().persistent()
            .get(&DataKey::Task(task_id))
            .expect("task not found");

        if task.status != TaskStatus::Submitted {
            panic!("task has not been submitted");
        }

        // Execute the token transfer from vault (admin) to earner
        let token_address: Address = env.storage().instance()
            .get(&DataKey::VaultToken).unwrap();
        let token_client = token::Client::new(&env, &token_address);

        // Transfer TOKA tokens from admin (vault) to earner
        token_client.transfer(&admin, &task.earner, &task.reward);

        task.status = TaskStatus::Approved;
        env.storage().persistent().set(&DataKey::Task(task_id), &task);

        env.events().publish(
            (symbol_short!("approved"), task_id),
            task.reward,
        );
    }

    /// Called by the Anchor to reject a submission.
    /// Task reverts to Pending so the earner can try again.
    pub fn reject_task(env: Env, task_id: u64) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut task: Task = env.storage().persistent()
            .get(&DataKey::Task(task_id))
            .expect("task not found");

        if task.status != TaskStatus::Submitted {
            panic!("task is not in submitted state");
        }

        task.status = TaskStatus::Pending;
        task.proof_cid = None;
        task.completed_at = None;

        env.storage().persistent().set(&DataKey::Task(task_id), &task);

        env.events().publish(
            (symbol_short!("rejected"), task_id),
            task.earner.clone(),
        );
    }

    /// Read a task's current state. Public.
    pub fn get_task(env: Env, task_id: u64) -> Task {
        env.storage().persistent()
            .get(&DataKey::Task(task_id))
            .expect("task not found")
    }

    /// Read total number of tasks created.
    pub fn get_task_count(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TaskCount).unwrap_or(0)
    }

    /// Read the admin address.
    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    /// Update max reward cap. Admin only.
    pub fn set_max_reward(env: Env, new_max: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::MaxReward, &new_max);
    }
}
```

---

## Build & Deploy

```bash
# Build the contract
cd contracts/toka-task
stellar contract build

# This produces:
# target/wasm32-unknown-unknown/release/toka_task.wasm

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/toka_task.wasm \
  --source deployer \
  --network testnet

# Returns: CONTRACT_ID (save this in .env)

# Initialize the contract
stellar contract invoke \
  --id $CONTRACT_ID \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin $ANCHOR_PUBLIC_KEY \
  --token $TOKA_TOKEN_CONTRACT \
  --max_reward 1000000000   # 100 TOKA (in stroops, 1 TOKA = 10^7)
```

---

## Testing the Contract

```bash
# Run unit tests
cd contracts/toka-task
cargo test

# Invoke individual functions on testnet

# Create a task (as anchor)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source anchor_key \
  --network testnet \
  -- create_task \
  --title "Wash the dishes" \
  --reward 50000000 \
  --earner $CHILD_PUBLIC_KEY

# Submit the task (as earner)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source child_key \
  --network testnet \
  -- submit_task \
  --task_id 1 \
  --proof_cid "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"

# Approve (as anchor)
stellar contract invoke \
  --id $CONTRACT_ID \
  --source anchor_key \
  --network testnet \
  -- approve_task \
  --task_id 1

# Read task state
stellar contract invoke \
  --id $CONTRACT_ID \
  --network testnet \
  -- get_task \
  --task_id 1
```

---

## Unit Test Template (`src/test.rs`)

```rust
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::{Address as _, Ledger}, Env, Address, String};

    #[test]
    fn test_full_task_lifecycle() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, TokaContract);
        let client = TokaContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let earner = Address::generate(&env);
        // Note: in a real test, deploy a mock token contract
        let token = Address::generate(&env);

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
        // ... setup same as above ...
        // Try to submit an already-approved task → should panic
    }
}
```

---

## Reward Amount Reference

| TOKA Amount | Stroop Value | PHP Equivalent |
|-------------|-------------|----------------|
| 1 TOKA | 10,000,000 | ₱1 |
| 5 TOKA | 50,000,000 | ₱5 |
| 10 TOKA | 100,000,000 | ₱10 |
| 20 TOKA | 200,000,000 | ₱20 |
| 50 TOKA | 500,000,000 | ₱50 |
| 100 TOKA | 1,000,000,000 | ₱100 |

> Stellar assets use 7 decimal places. 1 TOKA = 10,000,000 stroops.

---

## Post-Hackathon Improvements

1. **Deadline enforcement** — Add `deadline: u64` to Task; auto-reject via a cron-triggered contract call
2. **Batch approval** — `approve_tasks(task_ids: Vec<u64>)` to save gas/fees
3. **Dispute window** — Give earners 24h to appeal a rejection
4. **Spending controls** — Add `allowed_merchants: Vec<Address>` to restrict where earned tokens can be sent
5. **Multi-sig vault** — Require 2-of-2 (parent + backup key) for large vault withdrawals