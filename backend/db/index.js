const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'toka.db'));
db.pragma('journal_mode = WAL');

// Automatically apply schema updates for profile details if they don't exist
try {
  db.prepare('ALTER TABLE users ADD COLUMN relationship TEXT').run();
} catch (e) {
  // Column already exists, ignore
}
try {
  db.prepare('ALTER TABLE users ADD COLUMN age INTEGER').run();
} catch (e) {
  // Column already exists, ignore
}
try {
  db.prepare('ALTER TABLE users ADD COLUMN savings_goal TEXT').run();
} catch (e) {
  // Column already exists, ignore
}

try {
  db.prepare('ALTER TABLE users ADD COLUMN stellar_secret_key TEXT').run();
} catch (e) {
  // Column already exists, ignore
}

try {
  db.prepare('ALTER TABLE tasks ADD COLUMN recurrence TEXT').run();
} catch (e) {
  // Column already exists, ignore
}

// Add exchange rate to families
try {
  db.prepare('ALTER TABLE families ADD COLUMN toka_exchange_rate INTEGER DEFAULT 10').run();
} catch (e) {
  // Column already exists, ignore
}

// Create task_approvals table for logical multi-sig
db.exec(`
  CREATE TABLE IF NOT EXISTS task_approvals (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    anchor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, anchor_id)
  );
`);

// Create shop_rewards table
db.exec(`
  CREATE TABLE IF NOT EXISTS shop_rewards (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    toka_cost INTEGER NOT NULL,
    image_url TEXT,
    required_streak INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create cashouts table
db.exec(`
  CREATE TABLE IF NOT EXISTS cashouts (
    id TEXT PRIMARY KEY,
    family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    earner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    toka_amount INTEGER NOT NULL,
    fiat_amount REAL NOT NULL,
    reward_title TEXT,
    status TEXT CHECK(status IN ('pending', 'fulfilled')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

try {
  db.prepare('ALTER TABLE cashouts ADD COLUMN reward_title TEXT').run();
} catch (e) {
  // Already exists
}

// -------------------------------------------------------------
// Advanced Features Migrations (XP, Interest Savings, Collaborative, Ledger)
// -------------------------------------------------------------
try {
  db.prepare('ALTER TABLE users ADD COLUMN xp INTEGER DEFAULT 0').run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE users ADD COLUMN savings_balance REAL DEFAULT 0.0').run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE families ADD COLUMN tax_flat_amount INTEGER DEFAULT 0').run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE families ADD COLUMN tax_percentage REAL DEFAULT 0.0').run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE families ADD COLUMN tax_frequency TEXT DEFAULT "none"').run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE families ADD COLUMN tax_description TEXT DEFAULT "Household Tax"').run();
} catch (e) {}

try {
  db.prepare('ALTER TABLE families ADD COLUMN interest_rate REAL DEFAULT 0.02').run();
} catch (e) {}


try {
  db.prepare('ALTER TABLE tasks ADD COLUMN is_collaborative INTEGER DEFAULT 0').run();
} catch (e) {}

// Create task_contributions table
db.exec(`
  CREATE TABLE IF NOT EXISTS task_contributions (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    earner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proof_ipfs_cid TEXT,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, earner_id)
  );
`);

// Create transactions table (unified ledger)
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
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
`);

// Create auctions table
db.exec(`
  CREATE TABLE IF NOT EXISTS auctions (
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
`);

// Create auction_bids table
db.exec(`
  CREATE TABLE IF NOT EXISTS auction_bids (
    id TEXT PRIMARY KEY,
    auction_id TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── Feature: Task Streak Counter ────────────────────────────────────────────
try {
  db.prepare('ALTER TABLE users ADD COLUMN task_streak INTEGER DEFAULT 0').run();
} catch (e) {}

// ─── Feature: Numeric Savings Goal Target ─────────────────────────────────────
try {
  db.prepare('ALTER TABLE users ADD COLUMN savings_goal_amount REAL DEFAULT 0').run();
} catch (e) {}

module.exports = db;


