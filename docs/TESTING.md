# Testing

This document lists the checks to validate the core features of the app (backend, mobile, and smart contract).

## Prerequisites

- Node.js installed
- Rust + Stellar CLI installed (for contract tests)
- Testnet accounts funded (anchor and earner)
- Backend .env configured (see README and SMART_CONTRACTS.md for required values)
- Mobile Expo config set (EXPO_PUBLIC_* values as needed)

## 1) Smart Contract Unit Tests (Soroban)

From the repo root:

```bash
cd contracts/toka-task
cargo test
```

Expected: unit tests pass. If tests fail due to missing token mock, the contract still compiles and core task lifecycle tests should pass as implemented.

## 2) Backend Service Sanity Test

This verifies Soroban access and Stellar payment stream listeners.

```bash
cd backend
node test_services.js
```

Expected:
- Logs a task fetch from the contract
- Starts the payment listener without crashing
- Exits after a few seconds with success

## 3) Backend API Smoke Tests

Start the backend:

```bash
cd backend
npm install
npm run dev
```

Use curl or Postman to verify core API flows.

### 3.1 Register anchor

```bash
curl -X POST http://localhost:3333/auth/register \
  -H "Content-Type: application/json" \
  -d '{"vault_address":"<VAULT_PUBLIC_KEY>","family_name":"Test Family","stellar_public_key":"<ANCHOR_PUBLIC_KEY>","display_name":"Anchor"}'
```

Expected:
- Returns JWT token
- Returns `invite_code`

### 3.2 Join as earner

```bash
curl -X POST http://localhost:3333/auth/join \
  -H "Content-Type: application/json" \
  -d '{"stellar_public_key":"<EARNER_PUBLIC_KEY>","display_name":"Earner","invite_code":"<INVITE_CODE>"}'
```

Expected:
- Returns JWT token for earner

### 3.3 Create task (anchor)

```bash
curl -X POST http://localhost:3333/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANCHOR_JWT>" \
  -d '{"title":"Wash dishes","description":"Kitchen cleanup","reward_amount":10,"earner_public_key":"<EARNER_PUBLIC_KEY>"}'
```

Expected:
- Task created with status pending
- Response includes `task_id`

### 3.4 Submit task (earner)

```bash
curl -X POST http://localhost:3333/tasks/<TASK_ID>/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <EARNER_JWT>" \
  -d '{"proof_ipfs_cid":"QmTestCID123"}'
```

Expected:
- Task status submitted

### 3.5 Approve task (anchor)

```bash
curl -X POST http://localhost:3333/tasks/<TASK_ID>/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANCHOR_JWT>" \
  -d '{}'
```

Expected:
- Task status approved
- Payment attempted (if `anchor_secret` is provided)

## 4) IPFS Upload Check (Mock or Pinata)

Start backend, then:

```bash
curl -X POST http://localhost:3333/ipfs/upload \
  -H "Authorization: Bearer <JWT>" \
  -F "file=@backend/test_image.jpg"
```

Expected:
- Returns a CID (mocked if Pinata credentials not configured)

## 5) Mobile Core Flow (Manual)

Start the backend and Expo dev server:

```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd mobile
npm install
npm start
```

Verify the end-to-end core loop:

1. Anchor creates wallet, funds via Friendbot, creates family
2. Earner creates wallet, joins family using invite code
3. Anchor creates a task assigned to earner
4. Earner opens task detail, uploads proof (image), submits
5. Anchor sees task in approvals, approves
6. Earner wallet balance increases and transaction appears

Expected: the full cycle completes on testnet without errors.

## 6) Optional: CLI Contract Lifecycle Test (Testnet)

See SMART_CONTRACTS.md for CLI commands to:
- create task
- submit task
- approve task
- read task state

Use these to validate contract behavior independent of the app.

## 7) Advanced Features API Tests

### 7.1 Family Marketplace: Shop Rewards & Cashouts

1. Create a shop reward (Anchor only):
```bash
curl -X POST http://localhost:3333/marketplace/rewards \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANCHOR_JWT>" \
  -d '{"title":"Extra Screen Time","toka_cost":50,"required_streak":0}'
```
Expected: returns `"success": true` and a `reward_id`.

2. Claim/Cash out TOKA (Earner only):
```bash
curl -X POST http://localhost:3333/marketplace/cashout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <EARNER_JWT>" \
  -d '{"toka_amount":500,"tx_hash":"mock_burn_tx_hash"}'
```
Expected: returns fiat cashout amount using the **Delayed Gratification Multiplier** (returns ₱62.50 instead of ₱50.00 base rate).

3. Fulfill cashout request (Anchor only):
```bash
curl -X POST http://localhost:3333/marketplace/cashouts/<CASHOUT_ID>/fulfill \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANCHOR_JWT>" \
  -d '{}'
```
Expected: returns `"success": true` and marks cashout request status as `fulfilled`.

### 7.2 Sibling Auctions

1. Create a sibling auction (Anchor only):
```bash
curl -X POST http://localhost:3333/marketplace/auctions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANCHOR_JWT>" \
  -d '{"title":"Choice of Saturday Movie","description":"Winner chooses the movie night title","min_bid":10,"ends_at":"2026-05-25T20:00:00Z"}'
```
Expected: returns auction ID.

2. Place bid on auction (Earner only):
```bash
curl -X POST http://localhost:3333/marketplace/auctions/<AUCTION_ID>/bid \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <EARNER_JWT>" \
  -d '{"amount":15}'
```
Expected: returns `"success": true`.

3. Finalize auction (Anchor only):
```bash
curl -X POST http://localhost:3333/marketplace/auctions/<AUCTION_ID>/finalize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANCHOR_JWT>" \
  -d '{}'
```
Expected: returns `"success": true` and transfers winning bid to family vault on-chain.

### 7.3 Taxes & Savings

1. Configure savings interest rate (Anchor only):
```bash
curl -X POST http://localhost:3333/wallet/savings/interest/configure \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANCHOR_JWT>" \
  -d '{"interest_rate":0.05}'
```

2. Deposit into savings balance (Earner only):
```bash
curl -X POST http://localhost:3333/wallet/savings/deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <EARNER_JWT>" \
  -d '{"amount":50,"earner_secret":"<EARNER_SECRET_KEY>"}'
```
Expected: transfers 50 TOKA to family vault and adds 50 TOKA to savings balance.

3. Configure household tax (Anchor only):
```bash
curl -X POST http://localhost:3333/wallet/taxes/configure \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANCHOR_JWT>" \
  -d '{"tax_flat_amount":5,"tax_percentage":0.0,"tax_frequency":"weekly","tax_description":"Weekly Room Rent"}'
```

4. Manually trigger tax collection (Anchor only):
```bash
curl -X POST http://localhost:3333/wallet/taxes/collect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ANCHOR_JWT>" \
  -d '{}'
```
Expected: deducts taxes from child accounts and pays to the vault.

