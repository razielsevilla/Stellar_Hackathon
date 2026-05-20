#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype,
    token, symbol_short,
    Address, Env, String,
};

// ─── Data Types ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
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
            (symbol_short!("submitted"), task_id),
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

mod test;
