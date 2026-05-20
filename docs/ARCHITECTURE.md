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
  "lucide-react-native": "icons",
  "expo-secure-store": "for keypair storage"
}
```

### State Management & React Native Navigation
In the current production build, to prevent state synchronization bugs across multiple tabs and screens, the frontend utilizes React local state (`useState` / `useEffect`), custom hooks (`useStellarBalance`), and direct API integrations. This avoids the stale caching issues associated with a global store (such as Zustand) when ledger and DB balances change.


---

## Layer 2: Backend (Node.js + Express)

### Responsibilities
The backend is intentionally **minimal** — it acts as a bridge for off-chain data only. All financial logic lives on-chain.

| Route Group | Purpose |
|-------------|---------|
| `/auth` | JWT registration, login, and family code generation |
| `/tasks` | Task CRUD (stored in DB, mirrored on-chain via contract) |
| `/ipfs` | Relay photo uploads to Pinata/IPFS, returning CIDs |
| `/family` | Family group management, invite codes, and vault queries |
| `/users` | User profile retrieval, push notifications, and settings |
| `/wallet` | P2P transfer, savings accounts, tax collection, and top-ups |
| `/marketplace` | Rewards shop, delayed gratification cashouts, and sibling auctions |

### Database Schema (SQLite Database Schema)

```sql
-- Families Table
CREATE TABLE families (
  id TEXT PRIMARY KEY,
  vault_address TEXT NOT NULL,
  family_name TEXT,
  invite_code TEXT UNIQUE,
  toka_exchange_rate INTEGER DEFAULT 10,  -- TOKA to fiat exchange rate
  tax_flat_amount INTEGER DEFAULT 0,
  tax_percentage REAL DEFAULT 0.0,
  tax_frequency TEXT DEFAULT "none",
  tax_description TEXT DEFAULT "Household Tax",
  interest_rate REAL DEFAULT 0.02,        -- savings interest rate
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  family_id TEXT REFERENCES families(id),
  stellar_public_key TEXT NOT NULL,
  stellar_secret_key TEXT,
  role TEXT CHECK(role IN ('anchor', 'earner')),
  display_name TEXT,
  avatar_emoji TEXT,
  push_token TEXT,
  relationship TEXT,
  age INTEGER,
  savings_goal TEXT,
  xp INTEGER DEFAULT 0,                   -- Experience Points
  savings_balance REAL DEFAULT 0.0        -- Savings Account Balance
);

-- Tasks Table
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
  recurrence TEXT,                   -- 'none', 'regular', 'daily', 'weekly', 'monthly'
  is_collaborative INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Task Approvals (Logical Multi-Sig)
CREATE TABLE task_approvals (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  anchor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, anchor_id)
);

-- Shop Rewards Table
CREATE TABLE shop_rewards (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  toka_cost INTEGER NOT NULL,
  image_url TEXT,
  required_streak INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cashouts Table
CREATE TABLE cashouts (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  earner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  toka_amount INTEGER NOT NULL,
  fiat_amount REAL NOT NULL,
  reward_title TEXT,
  status TEXT CHECK(status IN ('pending', 'fulfilled')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Task Contributions Table (Collaborative Tasks)
CREATE TABLE task_contributions (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  earner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proof_ipfs_cid TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, earner_id)
);

-- Unified Ledger Transactions Table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT CHECK(type IN ('reward', 'cashout', 'deposit', 'withdraw', 'transfer_send', 'transfer_receive', 'tax', 'interest')) NOT NULL,
  amount REAL NOT NULL,
  description TEXT,
  related_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  tx_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sibling Auctions Table
CREATE TABLE auctions (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  min_bid REAL NOT NULL DEFAULT 1.0,
  highest_bid REAL DEFAULT 0.0,
  highest_bidder_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  status TEXT CHECK(status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
  ends_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Auction Bids Table
CREATE TABLE auction_bids (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
JWT_SECRET=super_secret_key_123
PORT=3333
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
│   │   ├── family.js
│   │   ├── ipfs.js
│   │   ├── marketplace.js
│   │   ├── tasks.js
│   │   ├── users.js
│   │   └── wallet.js
│   ├── services/
│   │   ├── stellar.js
│   │   └── soroban.js
│   ├── db/
│   │   ├── index.js
│   │   └── schema.sql
│   └── index.js
├── mobile/                     # React Native app (Expo Router)
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── create-wallet.tsx
│   │   │   ├── login.tsx
│   │   │   └── welcome.tsx
│   │   ├── (anchor)/
│   │   │   ├── AnchorNavigator.tsx
│   │   │   ├── approvals.tsx
│   │   │   ├── create-task.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── marketplace.tsx
│   │   │   ├── profile.tsx
│   │   │   └── wallet.tsx
│   │   └── (earner)/
│   │       ├── EarnerNavigator.tsx
│   │       ├── dashboard.tsx
│   │       ├── profile.tsx
│   │       ├── shop.tsx
│   │       ├── task-detail.tsx
│   │       └── wallet.tsx
│   ├── components/
│   │   ├── TaskCard.tsx
│   │   ├── TokaBitMascot.tsx
│   │   └── WalletWidget.tsx
│   ├── hooks/
│   │   └── useStellarBalance.ts
│   ├── utils/
│   │   └── storage.ts
│   └── services/
│       └── api.ts
├── web/                        # React Vite Web Landing Page
│   ├── src/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── tailwind.config.js
│   └── package.json
├── docs/                       # Project documentation
└── README.md
```
