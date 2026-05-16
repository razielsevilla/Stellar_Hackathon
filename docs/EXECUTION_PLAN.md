# 📅 EXECUTION_PLAN.md — Solo Builder Day-by-Day Plan (May 18–24)

## 🎯 The One Thing That Must Work
By Day 5, one full cycle must be demonstrable on testnet:
> Parent creates task → Child submits photo proof → Parent approves → TOKA lands in child's wallet

Everything else is supporting this.

---

## Day 1 — Sunday, May 18: Kickoff & Environment

**Goal:** All tools installed, testnet accounts working, repo initialized.

### Morning (3–4 hrs)
- [ ] Attend opening ceremony (async is fine)
- [ ] Initialize GitHub repo with folder structure from `ARCHITECTURE.md`
- [ ] Install Rust + WebAssembly target + Stellar CLI
- [ ] Run `stellar keys generate` → create `deployer`, `anchor_test`, `earner_test` keys
- [ ] Fund all three via Friendbot
- [ ] Verify Stellar accounts exist on testnet explorer

### Afternoon (3–4 hrs)
- [ ] Set up Node.js backend skeleton (`index.js`, route files, `schema.sql`)
- [ ] Initialize SQLite database, run schema
- [ ] Set up Expo project (`npx create-expo-app@latest`)
- [ ] Install all frontend dependencies (see `FRONTEND.md`)
- [ ] Create `.env` and `.env.example` files

### Evening (2 hrs)
- [ ] Set up `constants/theme.ts` with design tokens
- [ ] Create basic tab navigation structure in Expo
- [ ] Push everything to GitHub

**Day 1 Deliverable:** Repo with empty but structured project. All accounts funded. Dev environment running.

---

## Day 2 — Monday, May 19: Build Phase I — Contracts & Wallets

**Goal:** Soroban contract deployed on testnet. Wallet creation flow working in app.

### Morning (4 hrs) — Soroban Contract
- [ ] Create `contracts/toka-task/` with `Cargo.toml`
- [ ] Write contract code from `SMART_CONTRACTS.md` into `src/lib.rs`
- [ ] Run `cargo test` — fix any compilation errors
- [ ] Build: `stellar contract build`
- [ ] Deploy to testnet: `stellar contract deploy ...` → save `CONTRACT_ID` to `.env`
- [ ] Initialize contract: `stellar contract invoke ... initialize ...`
- [ ] Test: Create a task via CLI, submit it, approve it → verify token transfer on testnet explorer

### Afternoon (3 hrs) — Stellar Service Layer
- [ ] Write `mobile/services/stellar.ts` (keypair gen, trustlines, balances)
- [ ] Write `backend/services/stellar.js` + `soroban.js`
- [ ] Test all functions in isolation (Node.js script, not full app yet)

### Evening (2 hrs) — Wallet Onboarding Screens
- [ ] Build `welcome.tsx` — role selection (Anchor / Earner)
- [ ] Build `create-wallet.tsx` — generate keypair, save to SecureStore, fund via Friendbot, create trustline
- [ ] Basic navigation flow: Welcome → Create Wallet → placeholder Dashboard

**Day 2 Deliverable:** Contract live on testnet. CLI-verified full task lifecycle. Wallet creation working in app.

---

## Day 3 — Tuesday, May 20: Checkpoint 1 + Auth + Task Backend

**Goal:** Submit Checkpoint 1. Backend auth working. Task CRUD functional.

### Morning (2 hrs) — Checkpoint 1 Submission
Write and submit:
- [ ] **Problem Statement:** OFW remittance inefficiency + unbanked youth + undervalued household labor
- [ ] **Solution Outline:** Family Vault on Stellar + Soroban task-to-reward automation + non-custodial wallets
- [ ] Include testnet contract address as proof of progress

### Late Morning / Afternoon (5 hrs) — Backend
- [ ] Write `routes/auth.js` — register + join family endpoints
- [ ] Write auth middleware (`middleware/auth.js` — JWT verify)
- [ ] Write `routes/tasks.js` — CRUD + submit/approve/reject endpoints
- [ ] Wire task approve endpoint to call `contractApproveTask()` on Soroban
- [ ] Wire task create endpoint to call `contractCreateTask()` on Soroban
- [ ] Test all endpoints with Postman or `curl`

### Evening (2 hrs)
- [ ] Write `routes/ipfs.js` — file upload to Pinata
- [ ] Test IPFS upload: upload a test image, verify CID, fetch from gateway
- [ ] Write `services/api.ts` in mobile (Axios instance with base URL + JWT header)

**Day 3 Deliverable:** Checkpoint 1 submitted. Full backend API functional. IPFS upload working.

---

## Day 4 — Wednesday, May 21: Build Phase II — Frontend Core

**Goal:** Both Anchor and Earner dashboards working end-to-end.

### Morning (4 hrs) — Anchor Screens
- [ ] `(anchor)/dashboard.tsx` — family overview, task list, vault balance
- [ ] `(anchor)/create-task.tsx` — form: title, description, reward, assignee, deadline
- [ ] `(anchor)/approvals.tsx` — list of `status: submitted` tasks with proof photo preview
- [ ] Implement `approve` and `reject` buttons → call API → update state

### Afternoon (3 hrs) — Earner Screens
- [ ] `(earner)/dashboard.tsx` — my tasks list + wallet widget
- [ ] `(earner)/task-detail.tsx` — task info + `ProofUploader` component
- [ ] `(earner)/wallet.tsx` — balance + transaction history (from Horizon)
- [ ] Wire up `useStellarBalance` hook for real-time balance updates

### Evening (2 hrs)
- [ ] End-to-end test: Create task (Anchor) → complete + submit photo (Earner) → approve (Anchor) → verify TOKA received
- [ ] Fix any broken flows
- [ ] Add `TokaBitMascot` component placeholder (can be a simple emoji for now)

**Day 4 Deliverable:** Full core loop working in the app. Both roles usable.

---

## Day 5 — Thursday, May 22: Checkpoint 2 + Polish

**Goal:** Submit Checkpoint 2 with testnet demo. UI polish. Error handling.

### Morning (2 hrs) — Checkpoint 2 Submission
- [ ] Record a short screen recording of the core loop on testnet
- [ ] Submit: MVP progress + early demo walkthrough link

### Late Morning (3 hrs) — Error Handling & Edge Cases
- [ ] Handle: account not found, insufficient vault balance, task in wrong state
- [ ] Add loading states to all async operations
- [ ] Add error messages / toast notifications
- [ ] Handle: first-time user flow end-to-end (no account → create → join family)

### Afternoon (3 hrs) — UI Polish
- [ ] Apply full color scheme and design tokens throughout
- [ ] Add `WalletWidget` glassmorphism effects
- [ ] Style task status pills (color-coded)
- [ ] Add `TokaBitMascot` animation (sparkle on balance update)
- [ ] Make the "proof photo" display nicely in the approval screen

### Evening (1 hr)
- [ ] Join optional live mentor office hours
- [ ] Note any feedback, adjust priorities for Day 6

**Day 5 Deliverable:** Checkpoint 2 submitted. App feels stable. Demo-ready core flow.

---

## Day 6 — Friday, May 23: Final Demo Day

**Goal:** Present at PDAX Office (3:00 PM – 8:00 PM). Win.

### Morning (3 hrs) — Final Polish & Demo Prep
- [ ] Fix any remaining bugs from mentor feedback
- [ ] Ensure testnet demo accounts are funded and ready
- [ ] Pre-create a "demo family" with sample tasks already set up
- [ ] Write your 3–5 minute pitch script (see `DEMO_SCRIPT.md`)
- [ ] Practice the demo flow 3 times minimum

### Early Afternoon (2 hrs) — GitHub README
- [ ] Update `README.md` with final project details
- [ ] Add screenshots / screen recordings
- [ ] Add testnet contract address and how to verify
- [ ] Submit project on Rise In Platform

### Afternoon — DEMO DAY 🎤
- 3:00 PM — Arrive at PDAX Office
- Present: 3–5 minute pitch + live demo
- Q&A with judges
- 🏆 Announcement of winners

---

## Day 7 — Saturday, May 24: Wrap-Up (Optional)

- [ ] Write a post-mortem / lessons learned
- [ ] Document any post-hackathon roadmap (multi-sig vault, dispute window, etc.)
- [ ] Share on LinkedIn / Twitter / Dev.to
- [ ] Submit GitHub repo link to Rise In if not done

---

## ⚡ MVP Scope Boundaries

### MUST HAVE (core loop)
- Keypair generation + secure storage
- Family creation (Anchor) + joining (Earner)
- TOKA trustline setup
- Create task (Anchor)
- Submit task + photo proof (Earner)
- Approve task → Soroban transfer (Anchor)
- View TOKA balance (Earner)

### NICE TO HAVE (if time allows)
- Reject task flow
- Transaction history screen
- Deadline display
- TokaBit mascot animation
- Push notifications

### OUT OF SCOPE (post-hackathon)
- Multi-sig vault
- PHPC stablecoin integration
- Marketplace for spending TOKA
- Web version
- Mainnet deployment

---

## 🆘 Contingency Plans

| Problem | Fallback |
|---------|---------|
| Soroban contract won't compile | Use direct Stellar payment operations (no contract) — still demonstrates the concept |
| IPFS upload is slow/unreliable | Store photo as base64 in your own backend DB for demo |
| Mobile app has crashes | Use a web app (React + Expo Web) instead |
| Contract deployment fails | Use CLI demo to show contract interaction alongside a mockup UI |
| Can't make it to PDAX Office | Submit a 5-minute demo video |

---

## ⏰ Daily Time Budget (Solo Builder)

```
Wake up → 1 hr: Plan the day, review yesterday's output
Morning block (4 hrs): Hardest / most complex task
Lunch break: 1 hr
Afternoon block (3 hrs): Integration and testing
Break: 30 min
Evening block (2 hrs): UI polish or documentation
Total: ~10 hrs/day × 6 days = 60 hours
```
