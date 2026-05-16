# 🏗️ ARCHITECTURE.md — Toka System Design

## Overview

Toka is a mobile-first dApp with four distinct layers: a React Native frontend, a lightweight Node.js backend, Soroban smart contracts on Stellar, and IPFS for decentralized photo storage.

```
┌─────────────────────────────────────────────────────────────┐
│                     MOBILE APP (Expo)                       │
│         React Native UI  ←→  Stellar SDK (JS)               │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP / WebSocket
┌────────────────────────▼────────────────────────────────────┐
│                  BACKEND (Node.js + Express)                │
│    Task Manager  |  Auth  |  IPFS Bridge  |  Webhook Relay  │
└──────┬─────────────────────────────────┬────────────────────┘
       │ Stellar SDK                     │ IPFS HTTP API
┌──────▼──────────────┐        ┌─────────▼───────────────┐
│  STELLAR NETWORK    │        │   IPFS / Pinata         │
│  ┌───────────────┐  │        │  (Proof-of-Chore Photos)│
│  │ Soroban       │  │        └─────────────────────────┘
│  │ Contract      │  │
│  │ (Task-Reward) │  │
│  └───────────────┘  │
│  Family Vault Acct  │
│  Child Wallets      │
└─────────────────────┘
```

---

## Layer 1: Mobile Frontend (React Native + Expo)

### Responsibilities
- User authentication (PIN + keypair unlock)
- Displaying tasks, wallet balance, transaction history
- Task creation (Anchor) and task completion (Earner)
- Photo capture and IPFS upload for proof-of-chore
- Signing and submitting Stellar transactions

### Key Libraries
```json
{
  "@stellar/stellar-sdk": "^12.x",
  "expo-camera": "for proof-of-chore photos",
  "expo-secure-store": "for keypair storage",
  "expo-file-system": "for IPFS upload",
  "@react-navigation/native": "navigation",
  "zustand": "state management"
}
```

### State Management (Zustand Stores)
```
authStore       → keypair, role (anchor/earner), PIN status
familyStore     → vault address, family members, balances
taskStore       → task list, pending approvals, history
walletStore     → TOKA balance, XLM balance, tx history
```

---

## Layer 2: Backend (Node.js + Express)

### Responsibilities
The backend is intentionally **minimal** — it acts as a bridge for off-chain data only. All financial logic lives on-chain.

| Route Group | Purpose |
|-------------|---------|
| `/auth` | JWT issuance, family code generation |
| `/tasks` | Task CRUD (stored in DB, mirrored on-chain via contract) |
| `/ipfs` | Relay photo uploads to Pinata/IPFS, return CID |
| `/webhook` | Listen to Stellar Horizon event stream for tx confirmations |
| `/family` | Family group management, invite codes |

### Database Schema (SQLite for MVP / PostgreSQL for production)

```sql
-- Families
CREATE TABLE families (
  id TEXT PRIMARY KEY,
  vault_address TEXT NOT NULL,
  family_name TEXT,
  invite_code TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  family_id TEXT REFERENCES families(id),
  stellar_public_key TEXT NOT NULL,
  role TEXT CHECK(role IN ('anchor', 'earner')),
  display_name TEXT,
  avatar_emoji TEXT
);

-- Tasks
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  family_id TEXT REFERENCES families(id),
  assigned_to TEXT REFERENCES users(id),
  created_by TEXT REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  reward_amount DECIMAL NOT NULL,    -- in TOKA
  reward_asset TEXT DEFAULT 'TOKA',
  status TEXT CHECK(status IN ('pending','submitted','approved','rejected','paid')),
  proof_ipfs_cid TEXT,               -- filled when child submits
  contract_tx_hash TEXT,             -- filled when payment executes
  deadline DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Layer 3: Stellar Network

### Accounts

| Account | Type | Purpose |
|---------|------|---------|
| Issuer Account | Stellar Account | Issues TOKA tokens |
| Family Vault | Stellar Account | Holds family funds (multi-sig optional) |
| Child Wallet(s) | Stellar Account | Individual earner wallets |

### Asset: TOKA

```
Asset Code:   TOKA
Asset Issuer: <ISSUER_PUBLIC_KEY>
Decimals:     7 (Stellar default)
Pegging:      1 TOKA = 1 PHP (soft peg for MVP, use XLM for simplicity)
```

### Multi-Sig Configuration (Vault)
For MVP, the vault is a **standard Stellar account** controlled by the parent.
Post-hackathon: implement multi-sig where 2-of-3 signatures (parent + Soroban contract + backup) are required for withdrawals above a threshold.

```
Vault Thresholds (MVP):
  Low:    1  (viewing)
  Med:    1  (task payments via contract)
  High:   2  (vault withdrawal)
```

---

## Layer 4: Soroban Smart Contract

See `SMART_CONTRACTS.md` for full code.

### Contract Functions

| Function | Caller | Description |
|----------|--------|-------------|
| `initialize` | Anchor | Sets up vault, admin, token |
| `create_task` | Anchor | Registers a task with reward |
| `submit_task` | Earner | Marks task done, attaches IPFS CID |
| `approve_task` | Anchor | Approves + triggers token transfer |
| `reject_task` | Anchor | Rejects submission, task reopens |
| `get_task` | Anyone | Read task details |
| `get_balance` | Anyone | Read earner's accumulated balance |

---

## Layer 5: IPFS Storage

### Proof-of-Chore Flow

```
1. Child takes photo in-app (expo-camera)
2. App sends photo to backend /ipfs/upload
3. Backend relays to Pinata API → returns CID
4. CID stored in tasks table AND passed to submit_task() contract call
5. Parent sees photo (fetched via https://gateway.pinata.cloud/ipfs/{CID})
6. Parent approves → payment executes
```

### Why IPFS?
- Immutable proof — the CID is a hash of the photo, it cannot be tampered with
- Parent approving on-chain implicitly approves a specific CID
- Creates an auditable history of completed tasks

---

## Data Flow: Complete Task Lifecycle

```
STEP 1 — Task Creation
Anchor App → POST /tasks → DB (status: 'pending')
           → create_task() Soroban call → Stellar

STEP 2 — Task Submission  
Earner App → Photo → POST /ipfs/upload → Pinata → CID
           → POST /tasks/:id/submit (with CID)
           → submit_task(task_id, cid) Soroban call
           → DB update (status: 'submitted')
           → Push notification to Anchor

STEP 3 — Approval & Payment
Anchor App → approve_task(task_id) Soroban call
           → Contract transfers TOKA from Vault to Earner wallet
           → Horizon emits transaction event
           → Backend webhook updates DB (status: 'paid', tx_hash)
           → Earner app updates balance display

STEP 4 — Earner Sees Balance
Earner App → GET /wallet/balance → Stellar Horizon API
           → Display updated TOKA balance
```

---

## Security Considerations

| Risk | Mitigation |
|------|-----------|
| Child reusing old photos | IPFS CID is unique per photo; timestamp metadata embedded |
| Private key exposure | Keys stored in Expo SecureStore (hardware-backed on device) |
| Vault drain | Contract limits single-tx payout to `max_reward_per_task` |
| Replay attacks | Soroban task IDs are unique; contract checks task status |
| Unauthorized approvals | Only vault admin keypair can call `approve_task` |

---

## Environment Variables (.env)

```bash
# Stellar
STELLAR_NETWORK=testnet
HORIZON_URL=https://horizon-testnet.stellar.org
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
CONTRACT_ID=<deployed_contract_id>

# Token
ISSUER_SECRET_KEY=<issuer_secret>
VAULT_SECRET_KEY=<vault_secret>

# IPFS
PINATA_API_KEY=<your_pinata_key>
PINATA_SECRET_KEY=<your_pinata_secret>

# Backend
JWT_SECRET=<random_secret>
PORT=3000
DATABASE_URL=./toka.db
```

---

## Folder Structure

```
toka-app/
├── contracts/                  # Soroban Rust contracts
│   └── toka-task/
│       ├── src/lib.rs
│       └── Cargo.toml
├── backend/                    # Node.js API
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tasks.js
│   │   ├── ipfs.js
│   │   └── family.js
│   ├── services/
│   │   ├── stellar.js
│   │   └── soroban.js
│   ├── db/
│   │   └── schema.sql
│   └── index.js
├── mobile/                     # React Native app
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (anchor)/
│   │   └── (earner)/
│   ├── components/
│   │   ├── TaskCard.tsx
│   │   ├── WalletWidget.tsx
│   │   └── TokaBitMascot.tsx
│   ├── stores/
│   │   ├── authStore.ts
│   │   ├── taskStore.ts
│   │   └── walletStore.ts
│   └── services/
│       ├── stellar.ts
│       └── api.ts
├── docs/                       # This documentation
└── README.md
```
