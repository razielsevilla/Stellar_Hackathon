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
  stellar_secret_key TEXT,
  role TEXT CHECK(role IN ('anchor', 'earner')),
  display_name TEXT,
  avatar_emoji TEXT,
  push_token TEXT,
  relationship TEXT,
  age INTEGER,
  savings_goal TEXT
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
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
