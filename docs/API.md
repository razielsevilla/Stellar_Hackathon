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
Development: http://localhost:3000
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', network: process.env.STELLAR_NETWORK });
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Toka API running on port ${process.env.PORT || 3000}`);
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
