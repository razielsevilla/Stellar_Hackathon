# 🏁 Checkpoint 1 — Progress Check-in Guide

> **Hackathon Milestone:** Checkpoint 1 (May 20, 2026)  
> **Project:** Toka — Gamifying Household Responsibility, Tokenizing Financial Literacy  
> **Theme:** Real-World Financial Solutions (Financial Inclusion / Payments & Remittances)

Use this guide to walk the Hackathon Lead through your progress, demonstrating full alignment with the hackathon mechanics and guidelines.

---

## 🎯 Part 1: Elevator Pitch (Checkpoint 1 Core)

*   **What is Toka?**  
    Toka is a mobile dApp that turns family micro-incentives into an educational micro-economy on the Stellar blockchain. Parents/OFWs fund a on-chain family vault, assign chores (Tokas) to children, and reward them with `TOKA` tokens upon verifiable completion.
*   **The Problem We Solve:**
    1.  **Financial Exclusion:** Filipino youth have no early exposure to non-custodial assets or banking concepts.
    2.  **Remittance Transparency:** OFWs send money back home to kids but have zero visibility or control over how it is spent.
    3.  **High Gas Fees:** Micro-transactions of ₱5–₱20 are impossible on other chains; Stellar makes them feasible (settles in 3s, costs $0.00001).
*   **The Solution:**  
    A non-custodial family wallet ecosystem powered by Soroban smart contracts that gates remittance payouts behind verified household responsibilities.

---

## ⚙️ Part 2: Technical Execution & Stellar Integration (Testnet Phase)

Show the Hackathon Lead that you have successfully completed the **Testnet Phase** according to the deployment guidelines:

1.  **Soroban Smart Contract:**
    *   **Status:** Deployed and verified on Stellar Testnet.
    *   **Contract ID:** `CC55Z5AYNCFCHUVEA3R2WNDQTYGOUWBF7QK3KMWEUANFB5JQMUGXIZLT`
    *   **Features:** Handles task creation, submission (storing IPFS proof photo CID), and parent-approved token releases completely on-chain.
2.  **In-App Wallet & Trustlines:**
    *   Automatic non-custodial key pair generation in-app (secured via device `SecureStore`).
    *   Automatic trustline setup for the custom `TOKA` asset on Testnet.
3.  **Advanced Micro-Finance Mechanics (Already Implemented):**
    *   **Sibling Auctions:** Bidding on family privileges (e.g., weekend movie choice) where the highest bidder's tokens are transferred back to the family vault on-chain.
    *   **Delayed Gratification Cashout:** Multiplier formula that boosts the fiat cashout exchange rate the longer/more tokens the child saves.
    *   **Taxes & Savings Interest:** Weekly household tax collection and interest yield configurations to teach kids real-world micro-finance concepts.

---

## 📋 Part 3: Hackathon Compliance Checklist

Verify to the lead that you are matching all official guidelines:

*   [x] **Rise In Registration:** Project registered officially on the Rise In platform.
*   [x] **Repository Structure:** Clean codebase split into `/mobile`, `/backend`, `/contracts`, and `/web`.
*   [x] **Strict README Compliance:** Restructured root `README.md` to follow the exact format mandated in `docs/HACKATHON_MECHANICS.md` to avoid automated flagging.
*   [x] **Screenshots Folder:** Created `./screenshots/` folder to host explorer verification images.
*   [x] **Testnet Verified:** Active Testnet contract address documented in environment config and README.

---

## 🚀 Part 4: Roadmap to Demo Day (Next Steps)

Brief the lead on your plan for the rest of the hackathon:

1.  **Pitch Deck & Video (Due May 23):** Draft a maximum 10-slide deck and record a 2–3 minute Loom demo showing the mobile app screens (roles, chore completion flow, mascot reaction, and auctions).
2.  **Mainnet Deployment (Stage 2):** Use the steps in `docs/HACKATHON_GUIDE.md` to:
    *   Configure Stellar Mainnet provider.
    *   Build and deploy `toka-task` contract to Mainnet.
    *   Deploy Stellar Asset Contract (SAC) for `TOKA` on Mainnet using the hackathon-funded XLM.
