# 📡 API.md — Backend API Reference

## Setup

```bash
cd backend
npm init -y
npm install express cors dotenv better-sqlite3 jsonwebtoken multer axios uuid
npm install -D nodemon

# Start dev server
npx nodemon index.js
```

## Base URL
```
Development: http://localhost:3333
Production:  https://your-api-domain.com
```

---

## Authentication

All protected routes require a JWT in the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

JWT payload contains: `{ userId, familyId, role, publicKey }`

---

## Endpoints

### Auth

#### `POST /auth/register`
Register a new user and create or join a family.

**Request:**
```json
{
  "public_key": "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGBWUS6GRK69YO7JSGVTOT",
  "display_name": "Nanay",
  "role": "anchor",
  "family_name": "Dela Cruz Family"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "usr_abc123",
    "display_name": "Nanay",
    "role": "anchor",
    "public_key": "GCEZWKCA5...",
    "family_id": "fam_xyz789"
  },
  "family": {
    "id": "fam_xyz789",
    "family_name": "Dela Cruz Family",
    "invite_code": "TOKA-4829",
    "vault_address": "GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37"
  }
}
```

---

#### `POST /auth/join`
Join an existing family as an earner.

**Request:**
```json
{
  "public_key": "GBBM6BKZPEHWYO3AMCA2UZTGRV7YNKG4ZFRP7JXAHQJ5QOVMYDTPWFM",
  "display_name": "Ate Maria",
  "invite_code": "TOKA-4829"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "user": { "id": "usr_def456", "role": "earner", "family_id": "fam_xyz789" },
  "family": { "id": "fam_xyz789", "family_name": "Dela Cruz Family" }
}
```

---

### Tasks

#### `GET /tasks`
Get all tasks for the authenticated user's family.

**Query params:**
- `status` (optional): filter by `pending | submitted | approved | rejected`
- `assigned_to` (optional): filter by user ID

**Response:**
```json
{
  "tasks": [
    {
      "id": "task_001",
      "title": "Wash the dishes",
      "description": "Clean all dishes after dinner",
      "reward_amount": 10,
      "reward_asset": "TOKA",
      "status": "pending",
      "assigned_to": {
        "id": "usr_def456",
        "display_name": "Ate Maria",
        "public_key": "GBBM6B..."
      },
      "created_by": { "id": "usr_abc123", "display_name": "Nanay" },
      "proof_ipfs_cid": null,
      "contract_tx_hash": null,
      "deadline": "2026-05-23T23:59:59Z",
      "created_at": "2026-05-21T10:00:00Z"
    }
  ]
}
```

---

#### `POST /tasks`
Create a new task. **Anchor only.**

**Request:**
```json
{
  "title": "Sweep the living room",
  "description": "Sweep and mop the floor",
  "reward_amount": 15,
  "assigned_to_user_id": "usr_def456",
  "deadline": "2026-05-23T18:00:00Z"
}
```

**Response:**
```json
{
  "task": {
    "id": "task_002",
    "title": "Sweep the living room",
    "status": "pending",
    "reward_amount": 15,
    "contract_task_id": 2
  }
}
```

**Side effect:** Calls `contractCreateTask()` on Soroban. Stores returned `contract_task_id`.

---

#### `POST /tasks/:id/submit`
Submit proof of task completion. **Earner only.**

**Request:**
```json
{
  "proof_cid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
}
```

**Response:**
```json
{
  "task": {
    "id": "task_002",
    "status": "submitted",
    "proof_ipfs_cid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
  }
}
```

**Side effect:** Calls `contractSubmitTask()` on Soroban.

---

#### `POST /tasks/:id/approve`
Approve a task and trigger payment. **Anchor only.**

**Request:** *(no body required)*

**Response:**
```json
{
  "task": {
    "id": "task_002",
    "status": "approved",
    "contract_tx_hash": "4a5d8f..."
  },
  "payment": {
    "to": "GBBM6B...",
    "amount": "15",
    "asset": "TOKA",
    "tx_hash": "4a5d8f9e..."
  }
}
```

**Side effect:** Calls `contractApproveTask()` on Soroban → triggers token transfer.

---

#### `POST /tasks/:id/reject`
Reject a submitted task. **Anchor only.**

**Request:**
```json
{
  "reason": "Photo shows yesterday's dishes"
}
```

**Response:**
```json
{
  "task": { "id": "task_002", "status": "pending" }
}
```

---

### IPFS

#### `POST /ipfs/upload`
Upload a proof photo to IPFS via Pinata.

**Request:** `multipart/form-data`
- `file`: image file (JPEG/PNG)

**Response:**
```json
{
  "cid": "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
  "url": "https://gateway.pinata.cloud/ipfs/QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
  "size": 42301
}
```

---

### Family

#### `GET /family`
Get the authenticated user's family details and member list.

**Response:**
```json
{
  "family": {
    "id": "fam_xyz789",
    "family_name": "Dela Cruz Family",
    "vault_address": "GDQP2KPQ...",
    "invite_code": "TOKA-4829",
    "members": [
      {
        "id": "usr_abc123",
        "display_name": "Nanay",
        "role": "anchor",
        "public_key": "GCEZWKCA5...",
        "avatar_emoji": "👩"
      },
      {
        "id": "usr_def456",
        "display_name": "Ate Maria",
        "role": "earner",
        "public_key": "GBBM6B...",
        "avatar_emoji": "👧",
        "toka_balance": "35.0000000"
      }
    ]
  }
}
```

---

#### `GET /family/vault-balance`
Get the current TOKA balance of the family vault.

**Response:**
```json
{
  "vault_address": "GDQP2KPQ...",
  "toka_balance": "450.0000000",
  "xlm_balance": "9.9998000"
}
```

---

### Users

#### `GET /users/me`
Retrieve user profile details and their associated family configuration.

**Response:**
```json
{
  "id": "usr_abc123",
  "family_id": "fam_xyz789",
  "stellar_public_key": "GCEZWKCA5VLDNRLN...",
  "role": "anchor",
  "display_name": "Nanay",
  "avatar_emoji": "👩",
  "relationship": "Mother",
  "age": 38,
  "savings_goal": "Family Vacation",
  "xp": 0,
  "savings_balance": 0.0,
  "family_name": "Dela Cruz Family",
  "invite_code": "TOKA-4829",
  "tax_flat_amount": 0,
  "tax_percentage": 0.0,
  "tax_frequency": "none",
  "tax_description": "Household Tax",
  "interest_rate": 0.02,
  "toka_exchange_rate": 10,
  "vault_address": "GDQP2KPQ..."
}
```

---

#### `POST /users/profile/update`
Update profile details.

**Request:**
```json
{
  "display_name": "Nanay Dela Cruz",
  "age": 39,
  "savings_goal": "Family Fund",
  "relationship": "Mother"
}
```

**Response:**
```json
{
  "success": true
}
```

---

#### `POST /users/push-token`
Update the user's mobile push notification token.

**Request:**
```json
{
  "push_token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
}
```

**Response:**
```json
{
  "success": true
}
```

---

### Wallet (Taxes, Savings, & Ledger)

#### `GET /wallet/history`
Retrieve the unified transaction ledger history. Anchors get the whole family history, earners get their own.

**Response:**
```json
[
  {
    "id": "tx_uuid_111",
    "family_id": "fam_xyz789",
    "user_id": "usr_def456",
    "type": "reward",
    "amount": 10.0,
    "description": "Paid: Wash the dishes",
    "related_user_id": "usr_abc123",
    "tx_hash": "4a5d8f9e...",
    "created_at": "2026-05-20T10:00:00Z"
  }
]
```

---

#### `POST /wallet/transfer`
Perform a peer-to-peer TOKA transfer to another child. **Earner only.**

**Request:**
```json
{
  "recipient_id": "usr_ghi789",
  "amount": 5.5,
  "sender_secret": "S..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Transfer completed successfully",
  "tx_hash": "b2f672ae..."
}
```

---

#### `POST /wallet/savings/deposit`
Deposit TOKA into the earner's interest-bearing savings balance. Transfers from child to family vault on-chain. **Earner only.**

**Request:**
```json
{
  "amount": 25,
  "earner_secret": "S..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Deposit successful"
}
```

---

#### `POST /wallet/savings/withdraw`
Withdraw TOKA from the savings balance. Transfers from family vault back to the child's wallet. **Earner only.**

**Request:**
```json
{
  "amount": 15
}
```

**Response:**
```json
{
  "success": true,
  "message": "Withdrawal successful"
}
```

---

#### `POST /wallet/taxes/configure`
Configure tax deduction rules for the family. **Anchor only.**

**Request:**
```json
{
  "tax_flat_amount": 5,
  "tax_percentage": 0.0,
  "tax_frequency": "weekly",
  "tax_description": "Weekly Room Tax"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Taxes configured successfully"
}
```

---

#### `POST /wallet/savings/interest/configure`
Configure the interest rate for the earner savings account. **Anchor only.**

**Request:**
```json
{
  "interest_rate": 0.05
}
```

**Response:**
```json
{
  "success": true,
  "message": "Savings interest configured successfully"
}
```

---

#### `POST /wallet/taxes/collect`
Trigger manual tax collection from all family earners. Deducts from child and pays to vault on-chain. **Anchor only.**

**Response:**
```json
{
  "success": true,
  "message": "Collected household taxes from 2 earners"
}
```

---

#### `POST /wallet/topup`
Mint new TOKA tokens directly to the parent's wallet via the issuer account. **Anchor only.**

**Request:**
```json
{
  "amount": 500
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully topped up 500 TOKA",
  "tx_hash": "c88f1c..."
}
```

---

### Family Marketplace (Shop, Auctions, & Cashouts)

#### `GET /marketplace/settings`
Get exchange rate and vault info.

**Response:**
```json
{
  "vault_address": "GDQP2KPQ...",
  "toka_exchange_rate": 10
}
```

---

#### `POST /marketplace/settings`
Update the family exchange rate (number of TOKA per 1 Fiat PHP). **Anchor only.**

**Request:**
```json
{
  "toka_exchange_rate": 12
}
```

**Response:**
```json
{
  "success": true,
  "toka_exchange_rate": 12
}
```

---

#### `GET /marketplace/rewards`
Get all shop rewards.

**Response:**
```json
[
  {
    "id": "reward_001",
    "family_id": "fam_xyz789",
    "title": "Extra 1 Hour of Screen Time",
    "toka_cost": 50,
    "image_url": null,
    "required_streak": 2,
    "created_at": "2026-05-20T08:00:00Z"
  }
]
```

---

#### `POST /marketplace/rewards`
Create a new shop reward. **Anchor only.**

**Request:**
```json
{
  "title": "Weekend Cinema Ticket",
  "toka_cost": 200,
  "image_url": "https://example.com/movie.jpg",
  "required_streak": 0
}
```

**Response:**
```json
{
  "success": true,
  "reward_id": "reward_002"
}
```

---

#### `DELETE /marketplace/rewards/:id`
Delete a shop reward. **Anchor only.**

**Response:**
```json
{
  "success": true
}
```

---

#### `GET /marketplace/cashouts`
Retrieve list of requested reward claims and fiat cashouts.

**Response:**
```json
[
  {
    "id": "cashout_uuid",
    "family_id": "fam_xyz789",
    "earner_id": "usr_def456",
    "toka_amount": 100,
    "fiat_amount": 10.0,
    "reward_title": null,
    "status": "pending",
    "created_at": "2026-05-20T11:00:00Z",
    "display_name": "Ate Maria",
    "avatar_emoji": "👧"
  }
]
```

---

#### `POST /marketplace/cashout`
Claim a shop reward or cash out TOKA for fiat (soft peg). **Earner only.**
Uses the **Delayed Gratification Multiplier** for cashouts:
- TOKA < 500: Base rate (e.g., 10 TOKA = 1 PHP)
- TOKA >= 500: 80% of base rate (makes each TOKA more valuable)
- TOKA >= 1000: 60% of base rate (makes each TOKA even more valuable, rewarding long-term saving)

**Request:**
```json
{
  "toka_amount": 1000,
  "tx_hash": "tx_hash_burn_from_child...",
  "reward_id": null
}
```

**Response:**
```json
{
  "success": true,
  "cashout_id": "cashout_005",
  "fiat_amount": 166.67,
  "reward_title": null
}
```

---

#### `POST /marketplace/cashouts/:id/fulfill`
Mark a reward purchase or cashout claim as fulfilled/paid. **Anchor only.**

**Response:**
```json
{
  "success": true
}
```

---

#### `GET /marketplace/auctions`
Get all family auctions (active & completed).

**Response:**
```json
[
  {
    "id": "auction_001",
    "family_id": "fam_xyz789",
    "title": "Claim the Front Seat for a Week",
    "description": "Bid to claim the passenger seat during family drives.",
    "min_bid": 10.0,
    "highest_bid": 25.0,
    "highest_bidder_id": "usr_def456",
    "status": "active",
    "ends_at": "2026-05-24T18:00:00Z",
    "highest_bidder_name": "Ate Maria"
  }
]
```

---

#### `POST /marketplace/auctions`
Create an auction for earners to bid on. **Anchor only.**

**Request:**
```json
{
  "title": "Anchor Selects Weekend Dinner Venue",
  "description": "Highest bidder chooses where the family eats on Sunday.",
  "min_bid": 20,
  "ends_at": "2026-05-22T20:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "auction_id": "auction_002"
}
```

---

#### `POST /marketplace/auctions/:id/bid`
Place a higher bid on an active auction. Checks earner balance first. **Earner only.**

**Request:**
```json
{
  "amount": 30.0
}
```

**Response:**
```json
{
  "success": true,
  "message": "Bid successfully placed!"
}
```

---

#### `POST /marketplace/auctions/:id/finalize`
Close an auction and trigger payment. Transfers TOKA from winning bidder to vault on-chain. **Anchor only.**

**Response:**
```json
{
  "success": true,
  "message": "Auction finalized successfully",
  "tx_hash": "tx_hash_transfer_to_vault..."
}
```


---

## Backend Implementation: `index.js`

```javascript
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/tasks', require('./routes/tasks'));
app.use('/ipfs', require('./routes/ipfs'));
app.use('/family', require('./routes/family'));
app.use('/users', require('./routes/users'));
app.use('/wallet', require('./routes/wallet'));
app.use('/marketplace', require('./routes/marketplace'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', network: process.env.STELLAR_NETWORK });
});

app.listen(process.env.PORT || 3333, () => {
  console.log(`Toka API running on port ${process.env.PORT || 3333}`);
});
```

---

## IPFS Route: `routes/ipfs.js`

```javascript
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const auth = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const metadata = JSON.stringify({
      name: `toka-proof-${Date.now()}`,
      keyvalues: { family_id: req.user.familyId, uploader: req.user.publicKey },
    });
    formData.append('pinataMetadata', metadata);

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          pinata_api_key: process.env.PINATA_API_KEY,
          pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
        },
      }
    );

    const cid = response.data.IpfsHash;
    res.json({
      cid,
      url: `https://gateway.pinata.cloud/ipfs/${cid}`,
      size: req.file.size,
    });
  } catch (err) {
    console.error('IPFS upload error:', err.message);
    res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
```

---

## Error Response Format

All errors follow this format:
```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": {}
}
```

Common error codes:
| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHORIZED` | 401 | Missing or invalid JWT |
| `FORBIDDEN` | 403 | Role doesn't have permission |
| `NOT_FOUND` | 404 | Resource not found |
| `TASK_WRONG_STATUS` | 400 | Task not in expected state |
| `CONTRACT_ERROR` | 500 | Soroban call failed |
| `UPLOAD_FAILED` | 500 | IPFS upload error |
