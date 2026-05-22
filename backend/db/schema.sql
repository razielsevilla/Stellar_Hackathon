-- Families
CREATE TABLE families (
  id TEXT PRIMARY KEY,
  vault_address TEXT NOT NULL,
  family_name TEXT,
  invite_code TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  toka_exchange_rate INTEGER DEFAULT 10,
  tax_flat_amount INTEGER DEFAULT 0,
  tax_percentage REAL DEFAULT 0.0,
  tax_frequency TEXT DEFAULT 'none',
  tax_description TEXT DEFAULT 'Household Tax',
  interest_rate REAL DEFAULT 0.02
);

-- Users
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
  savings_goal_amount REAL DEFAULT 0.0,
  xp INTEGER DEFAULT 0,
  savings_balance REAL DEFAULT 0.0,
  task_streak INTEGER DEFAULT 0
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
  recurrence TEXT,                   -- 'none', 'regular', 'daily', 'weekly', 'monthly'
  is_collaborative INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Task Approvals
CREATE TABLE task_approvals (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  anchor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, anchor_id)
);

-- Shop Rewards
CREATE TABLE shop_rewards (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  toka_cost INTEGER NOT NULL,
  image_url TEXT,
  required_streak INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cashouts
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

-- Task Contributions
CREATE TABLE task_contributions (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  earner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  proof_ipfs_cid TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, earner_id)
);

-- Transactions
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

-- Auctions
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

-- Auction Bids
CREATE TABLE auction_bids (
  id TEXT PRIMARY KEY,
  auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
