# 🎴 DECK.md — Toka Pitch Deck (Slide-by-Slide)

> **Format:** Max 10 slides · Target audience: Hackathon judges + potential investors
> **Design Language:** Deep Space background `#0A0F2C` · Cyan `#00E5FF` for accents · Orange `#FF6B35` for highlights
> **Font:** Space Grotesk Bold for headlines · Inter for body
> **Time:** Designed to support a 3–5 minute live pitch

---

## SLIDE 1 — TITLE / OPENING HOOK

**Layout:** Full-bleed dark background. Centered content. Large wordmark. Mascot element (TokaBit) bottom-right.

### Headline (Display Size — 72pt)
> **TOKA**

### Tagline (32pt, Cyan `#00E5FF`)
> *Gamifying Household Responsibility.*
> *Tokenizing Financial Literacy.*

### Sub-tagline (18pt, muted)
> A decentralized family micro-economy — built on the **Stellar Network**

### Visual Cue (bottom-left)
> Stellar logo · Soroban logo · "Build on Stellar Philippines 2026"

---

## SLIDE 2 — THE PROBLEM

**Layout:** Three-column problem card layout. Each card has a bold icon, a stat, and a one-line explanation. Dark card surface `#0F1640` with thin border.


### Slide Title (36pt)
> The Problem

### Card 1 — 💸 Invisible Remittances
> **₱1.6 Trillion** sent home by OFWs annually
>
> *Once the money lands, parents abroad lose all visibility into how it's spent.*

### Card 2 — 📚 Financial Illiteracy
> **1 in 3** Filipino youth have never held a savings account
>
> *Children grow up with no practical exposure to earning, saving, or budgeting.*

### Card 3 — 🏠 Unrewarded Labor
> **0 pesos** — the going rate for most household chores
>
> *The invisible domestic economy that keeps Filipino families running goes completely unrecognized and unrewarded.*

### Bottom Callout (full-width, orange accent)
> *"We're missing a system that ties responsibility to real, verifiable reward."*

---

## SLIDE 3 — THE SOLUTION

**Layout:** Central flow diagram — left side "The Family", right side "The Blockchain". Arrow flows from left to right. Clean, minimal, iconographic.

### Slide Title (36pt)
> Meet Toka

### Hero Statement (28pt, centered)
> *A mobile app that turns family chores into a real, on-chain micro-economy.*

### Core Loop Diagram (Horizontal Flow)

```
  👑 ANCHOR (Parent/OFW)
        │
        ▼
  📋 Assigns Task + TOKA Reward
        │
        ▼
  🏃 EARNER (Child) Completes It
  + Uploads Photo Proof to IPFS
        │
        ▼
  ✅ Parent Reviews & Approves
        │
        ▼
  💸 TOKA Sent to Child's Wallet
     via Stellar · 3 seconds · <₱0.01
```

### Supporting Bullets (18pt)
- 🔐 **Non-custodial wallets** — keys never leave the device
- 🌐 **IPFS proof-of-chore** — immutable, tamper-proof photo evidence
- 📲 **Push notifications** — real-time alerts for both parent and child
- ⛓️ **Soroban smart contracts** — fully on-chain task lifecycle

---

## SLIDE 4 — PRODUCT SHOWCASE

**Layout:** 2×2 screenshot grid (or 3 stacked phone mockups). Captions below each screenshot. Clean, no clutter.

### Slide Title (36pt)
> What We Built

### Screenshot Grid — 4 Panels

**Panel 1 — Anchor Dashboard**
> *Caption:* Parent sees all family tasks, TOKA vault balance, and household members at a glance.

**Panel 2 — Task Approval Screen**
> *Caption:* Photo proof submitted by child via IPFS. One-tap approval triggers the Stellar payment.

**Panel 3 — Earner Wallet**
> *Caption:* Child's live TOKA balance, transaction history, and savings goal tracker.

**Panel 4 — Family Marketplace**
> *Caption:* Sibling auction for weekend movie choice. Reward store for screen time and treats. Fiat cashout with savings multiplier.

> **Live on Stellar Mainnet** — Contract: `CBNKIN4EGJDUGPZXZ4JYGMNYVAGDM2HRKFEX57RG3OLCZSMZKGPVAWFN`
> **Also available on Testnet** — Contract: `CC55Z5AYNCFCHUVEA3R2WNDQTYGOUWBF7QK3KMWEUANFB5JQMUGXIZLT`

---

## SLIDE 5 — FEATURE DEPTH

**Layout:** Left column = feature icons with names. Right column = one-line impact statement per feature. Two columns separated by a glowing vertical line.

### Slide Title (36pt)
> Beyond the Basic Chore App

### Feature Table

| Feature | What It Teaches |
|---|---|
| 🏆 **XP & Level System** | Achievement unlocks and non-monetary recognition |
| 💰 **Savings Account + Interest** | Compounding savings at a parent-configured APR |
| 🏦 **Household Taxes** | How deductions work (daily or weekly auto-collection) |
| 🪄 **Delayed Gratification Multiplier** | Cashing out more TOKA at once = better exchange rate |
| 🏷️ **Sibling Auctions** | Real bidding mechanics, supply & demand, winner-takes-all |
| 🤝 **Collaborative Family Quests** | Teamwork, split rewards, multi-contributor tasks |
| 🎁 **Mystery Loot Box** | Risk vs. reward, probability — in a fun, safe context |
| 👨‍👩‍👧 **Co-Parent Multi-Approval** | Both parents must approve — logical multi-sig on-chain |
| 📅 **Recurring Task Scheduler** | Daily, weekly, monthly auto-generated chore assignments |

### Right-side Callout (24pt, orange)
> *"Toka doesn't just reward chores. It teaches an entire financial vocabulary — inside the family."*

---

## SLIDE 6 — WHY STELLAR

**Layout:** Dark background with Stellar logo prominent. Four bold reason cards. Each card has an icon, headline, and 2-line explanation.

### Slide Title (36pt)
> Built on Stellar — By Design, Not by Accident

### Reason Cards (2×2 grid)

**Card 1 — ⚡ Micro-Reward Economics**
> Transaction fees: **$0.00001**
>
> Sending ₱5 to a child for washing dishes is literally impossible with traditional banking. On Stellar, it costs a fraction of a centavo.

**Card 2 — 🚀 3-Second Finality**
> No "pending" state. No 3-day bank transfer.
>
> Children see their reward hit their wallet in real time — the feedback loop that makes gamification actually work.

**Card 3 — 🦀 Soroban Smart Contracts**
> The full task lifecycle — create, submit, approve, pay — lives on-chain.
>
> No trusted intermediary. The contract enforces the rules. The blockchain enforces the contract.

**Card 4 — 🇵🇭 Built for the Philippines**
> Stellar already powers financial inclusion across Southeast Asia.
>
> Future roadmap: PHPC integration, OFW cross-border vault top-ups, and peso-pegged savings accounts.

### Bottom Full-Width Quote
> *"For micro-rewards in an emerging market, Stellar isn't just a good choice — it's the only choice."*

---

## SLIDE 7 — TECHNICAL ARCHITECTURE

**Layout:** Simplified system diagram. Clean boxes with connecting arrows. Not a wall of text. Judges want to see you understand the stack.

---

### Slide Title (36pt)
> How It Works Under the Hood

### Architecture Diagram

```
┌─────────────────────────────────┐
│  📱 MOBILE APP (React Native)   │
│  Expo · Stellar SDK · SecureStore│
└────────────┬────────────────────┘
             │ HTTPS
┌────────────▼────────────────────┐
│  🖥️ BACKEND (Node.js + Express) │
│  Sponsor Wallet · SQLite · Cron │
│  Push Notifications · IPFS Relay│
└────┬───────────────────┬────────┘
     │ Stellar SDK        │ Pinata API
┌────▼──────────┐  ┌─────▼──────────────┐
│ STELLAR NETWORK│  │ IPFS (Pinata)      │
│ Horizon API    │  │ Immutable Photo CIDs│
│ Soroban RPC    │  └────────────────────┘
│ TOKA Asset     │
│ Family Vault   │
│ Smart Contract │
└───────────────┘
```

### Stack Summary (below diagram)

| Layer | Technology |
|---|---|
| Mobile | React Native · Expo · TypeScript |
| Backend | Node.js · Express · SQLite (better-sqlite3) |
| Blockchain | Stellar Network · Soroban Smart Contracts (Rust) |
| Storage | Pinata / IPFS (proof-of-chore photos) |
| Infra | JWT Auth · node-cron · Expo Push Notifications |

---

## SLIDE 8 — BUSINESS MODEL & MARKET

**Layout:** Left half = TAM/market stats. Right half = revenue model cards. Bold numbers, minimal text.

### Slide Title (36pt)
> The Opportunity

### Left Column — Market

**Total Addressable Market**
> 🌍 **1.8M OFWs** sending **₱1.6 Trillion** in remittances annually
> 🧒 **~27M Filipino children** aged 5–17 in households
> 📱 **73% smartphone penetration** in PH (2025)

**Our Beachhead**
> Filipino families with at least one parent working abroad or remotely, with school-age children (ages 8–18)

### Right Column — Revenue Model

**Model 1 — Vault Top-Up Fee (0.5%)**
> Parents fund the family vault with TOKA. We charge 0.5% — similar to a remittance fee, but 10–50x cheaper than banks.

**Model 2 — Premium Family Plan (₱299/month)**
> Unlimited children, advanced analytics dashboard, multi-vault support, and priority support.

**Model 3 — Ecosystem Grant**
> Aligned with Stellar Development Foundation's financial inclusion mission. Eligible for SDF ecosystem grants.

### Bottom Quote
> *"Every Filipino family is already a micro-economy. Toka just puts it on the blockchain."*

### Speaker Note
> The 0.5% fee model is the strongest — it maps directly to an existing behavior (vault top-up) and doesn't require users to change habits.

---

## SLIDE 9 — TRACTION & ROADMAP

**Layout:** Top half = "What We Built in 7 Days" checklist. Bottom half = phased roadmap timeline.

### Slide Title (36pt)
> What We Built · What's Next

### Top Section — MVP Traction (7 Days)

**✅ Shipped in 7 Days**

| Feature | Status |
|---|---|
| Non-custodial wallet generation + TOKA trustline | ✅ Live on Mainnet |
| Soroban smart contract (create → submit → approve) | ✅ Deployed (`CBNKIN...`) |
| Full task lifecycle with IPFS photo proof | ✅ Working |
| Family marketplace: shop, auctions, cashouts | ✅ Working |
| Savings interest + household taxes (cron-automated) | ✅ Working |
| Push notifications (Expo) | ✅ Working |
| Co-parent multi-approval (logical multi-sig) | ✅ Working |
| Demo mode (no wallet required) | ✅ Working |

### Bottom Section — Roadmap

```
Phase 1 (MVP)        Phase 2 (Hackathon Final)  Phase 3 (Q1 2027)
─────────────────    ──────────────────────     ─────────────────────
✅ Testnet Build     ✅ Mainnet Deployment      🔜 PHPC Integration
✅ Core Task Loop    ✅ Sponsor Wallet API      🔜 OFW Remittance Flow
✅ TOKA Token        ✅ Custom UI / Avatars     🔜 Multi-family Support
✅ Soroban Contract  🔜 XP Leaderboard UI       🔜 School Savings Program
✅ Family Marketplace🔜 Savings Goal Tracker    🔜 SDF Ecosystem Grant
```

---

## SLIDE 10 — CLOSING / THE ASK

**Layout:** Centered. Minimal. Emotionally resonant. End on the human story.

### Slide Title (36pt, Cyan)
> Every Filipino Family is Already a Micro-Economy.

### Body (24pt, white, centered)
> Toka puts it on the blockchain.

### Divider Line

### The Ask (20pt)

> 🏆 **For Judges:** We're asking for your recognition that financial literacy education can start at home — and that Stellar is the right infrastructure to make it happen for 1.8 million OFW families.

> 🤝 **For Mentors:** We need product feedback, connections to OFW community networks, and guidance on PHPC integration pathways.

> 🌱 **For the Ecosystem:** We want to grow Toka into the financial literacy layer for Filipino families on Stellar.

### Team Block

| Name | Role |
|---|---|
| **Raziel** | Founder · Lead Developer · Product Designer |

### Closing Line (32pt, orange, centered)
> *Salamat.* 🙏

### Contact / Links
> 🔗 GitHub: `github.com/razielsevilla`
> 📦 Contracts: `CBNKIN4EGJDUGPZXZ4JYGMNYVAGDM2HRKFEX57RG3OLCZSMZKGPVAWFN` (Mainnet) | `CC55Z5AYNCFCHUVEA3R2WNDQTYGOUWBF7QK3KMWEUANFB5JQMUGXIZLT` (Testnet)
> 🎬 Demo Video: `[Link]`

---

## APPENDIX — BONUS SLIDES (Optional / Q&A Support)

These slides can be brought up during Q&A if a judge asks a specific question. Don't include them in the main 10-slide deck.

### APPENDIX A — Security Model

> **Q: "How do you keep private keys safe?"**

- Private keys are generated **on-device** and stored in **Expo SecureStore** (hardware-backed encryption on both iOS and Android)
- The backend server **never receives** the private key in production — all signing happens client-side before submission
- **Sponsor Wallet Architecture:** We bypassed Testnet Friendbot by creating a secure backend Sponsor Wallet that seamlessly funds new family members on Mainnet.
- Post-hackathon plan: PIN/biometrics gate before any signing operation; optional social recovery via multi-sig

---

### APPENDIX B — Why Not GCash / PayMaya?

> **Q: "Can't families just use GCash?"**

| | GCash / PayMaya | Toka |
|---|---|---|
| Task-gated payments | ❌ Not possible | ✅ Core feature |
| Photo proof required | ❌ Not possible | ✅ IPFS-verified |
| OFW cross-border funding | ❌ Complex, fee-heavy | ✅ Stellar-native |
| Kids can hold wallets | ❌ 18+ only | ✅ Non-custodial, any age |
| Savings interest | ❌ <0.1% p.a. | ✅ Parent-configured |
| Real-time settlement | ❌ 1–3 banking days | ✅ 3–5 seconds on Stellar |
| Programmable rules | ❌ None | ✅ Soroban smart contracts |

---

### APPENDIX C — Token Economics

> **TOKA Token**

| Property | Value |
|---|---|
| Asset Code | `TOKA` |
| Issuer | Controlled account (current MVP) → DAO multi-sig (roadmap) |
| Soft Peg | 1 TOKA = 1 PHP (parent-configurable exchange rate) |
| Total Supply | Elastic — minted by parent vault top-up |
| Decimals | 7 (Stellar standard) |
| Trustline Required | Yes — set up automatically on wallet creation |

> **TOKA is not speculative.** It is a unit of household credit, backed by the parent's promise and redeemable for real pesos on demand.

---

### APPENDIX D — Judging Criteria Alignment

> **How Toka scores against official hackathon rubric**

| Judging Criterion | Weight | Toka's Position |
|---|---|---|
| 🌍 Real-World Impact | 30% | OFW families, financial literacy for 27M children — directly on-theme |
| ⚙️ Technical Execution (Stellar) | 25% | Soroban contract deployed, Horizon API, TOKA custom asset, trustlines, real txns |
| 🖥️ UX / Usability | 20% | Role-split navigation, demo mode for frictionless judging, toast feedback |
| 💡 Innovation | 15% | First "family micro-economy" use case on Stellar; Delayed Gratification Multiplier is novel |
| 📈 Feasibility | 10% | MVP is functional today; revenue model maps to existing OFW behavior |

---

*End of DECK.md — Toka Pitch Deck*
