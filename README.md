# 🪙 Toka — Gamifying Household Responsibility, Tokenizing Financial Literacy

> A decentralized family micro-economy app built on the Stellar Network for the Build on Stellar Philippines Hackathon 2026.

---

## 📁 Documentation Index

| File | Description |
|------|-------------|
| `README.md` | This file — project overview and quick start |
| `ARCHITECTURE.md` | Full technical architecture and system design |
| `SMART_CONTRACTS.md` | Soroban smart contract logic and code |
| `STELLAR_INTEGRATION.md` | Stellar SDK integration guide (wallets, assets, trustlines) |
| `FRONTEND.md` | React Native / Expo UI guide and component structure |
| `API.md` | Backend API endpoints and data models |
| `DEMO_SCRIPT.md` | Hackathon demo day script and pitch guide |
| `EXECUTION_PLAN.md` | Day-by-day build plan for May 18–24 |

---

## 🧠 What is Toka?

**Toka** is a mobile dApp that turns your family into a mini financial institution. Parents (or OFWs abroad) fund a **Family Vault** on the Stellar Network. Children complete household tasks — "Tokas" — and earn real Stellar-based tokens directly into their own non-custodial wallets.

No abstract points. No gift cards. Real digital money. Real financial literacy.

---

## 🚩 Problems Solved

| Problem | Toka's Answer |
|---------|--------------|
| Filipino youth are unbanked with no practical finance exposure | Non-custodial wallets as first "bank accounts" |
| OFWs can't control how remittances are spent on kids | Programmable vault with task-gated releases |
| Household chores are invisible, undervalued labor | Tokenized rewards tied to real domestic tasks |
| Micro-rewards (₱5–₱20) are impossible on high-fee chains | Stellar fees ~$0.00001 make it viable |

---

## 🏗️ Core Loop (MVP)

```
[Parent] Creates Task → [Child] Completes + Uploads Photo → [Parent] Approves
       → [Soroban Contract] Executes Transfer → [Child Wallet] Receives Tokens
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile Frontend | React Native + Expo |
| Blockchain | Stellar Network (Testnet → Mainnet) |
| Smart Contracts | Soroban (Rust) |
| Token | TOKA (custom Stellar asset) / PHPC |
| Storage | IPFS (proof-of-chore photos) |
| Backend | Node.js + Express |
| Wallet | Freighter-compatible / in-app keypair |

---

## ⚡ Quick Start (Development)

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/toka-app.git
cd toka-app

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Fill in STELLAR_NETWORK, HORIZON_URL, CONTRACT_ID

# 4. Start Expo dev server
npx expo start

# 5. Deploy Soroban contract to testnet (see SMART_CONTRACTS.md)
```

---

## 🌐 Stellar Network Config

```
Testnet Horizon:    https://horizon-testnet.stellar.org
Testnet Friendbot:  https://friendbot.stellar.org
Soroban RPC:        https://soroban-testnet.stellar.org
Network Passphrase: "Test SDF Network ; September 2015"
```

---

## 👤 User Roles

### 🏠 Anchor (Parent / OFW)
- Creates and funds the Family Vault
- Assigns tasks to children
- Approves task completions
- Sets token reward amounts per task

### 👧 Earner (Child / Family Member)
- Views assigned tasks
- Marks tasks complete + uploads proof photo
- Receives TOKA tokens upon parent approval
- Views wallet balance and transaction history

---

## 🎨 Design Language

- **Background:** Deep Blue `#0A0F2C` with Cyan `#00E5FF` accents
- **Action Color:** Orange `#FF6B35`
- **Style:** 3D infographic widgets, glassmorphism cards
- **Mascot:** "TokaBit" — reacts to transactions (sparkles on receive, hard hat when task is active)

---

## 📅 Hackathon Timeline

| Day | Date | Milestone |
|-----|------|-----------|
| Day 1 | May 18 | Kickoff, Stellar setup, contract scaffolding |
| Day 2 | May 19 | Core contract logic, wallet integration |
| Day 3 | May 20 | **Checkpoint 1** — Submit idea + solution outline |
| Day 4 | May 21 | Frontend UI, task flow screens |
| Day 5 | May 22 | **Checkpoint 2** — Testnet demo, mentor feedback |
| Day 6 | May 23 | Polish + **Final Demo Day** (PDAX Office, 3–8 PM) |
| Day 7 | May 24 | GitHub README, pitch deck finalization |

---

## 🏆 Hackathon Track

**Primary:** 🌏 Financial Inclusion
**Secondary:** 💸 Payments & Remittances + 🏪 MSME & Commerce Tools

---

*Built solo for Build on Stellar Philippines Hackathon 2026.*
