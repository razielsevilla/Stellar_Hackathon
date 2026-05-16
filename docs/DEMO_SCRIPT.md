# 🎤 DEMO_SCRIPT.md — Hackathon Pitch & Demo Guide

## Format
- **Time:** 3–5 minutes
- **Structure:** Hook → Problem → Solution → Live Demo → Why Stellar → Ask
- **Tone:** Confident, specific, Filipino-grounded

---

## THE SCRIPT

### 0:00 – 0:30 | The Hook

> *"My father worked in Saudi Arabia for 10 years. Every month, he sent money home — but he had no idea if that money was going to tuition, or to load, or to merienda. He trusted. That's all he could do."*

> *"Toka changes that."*

---

### 0:30 – 1:30 | The Problem (Be Specific)

> *"There are 1.8 million OFWs sending remittances to the Philippines every single month. But once that money lands in a bank account here, they lose control of it completely."*

> *"At the same time, Filipino youth are growing up unbanked — no savings account, no financial identity, no way to practice managing money. And household chores — the invisible labor that keeps Filipino families running — go completely unrewarded and unrecognized."*

> *"We're missing something: a system that ties responsibility to reward, in real money."*

---

### 1:30 – 2:00 | The Solution

> *"Toka is a family micro-economy app built on the Stellar Network."*

> *"A parent — whether they're in Makati or in Dubai — creates a Family Vault on Stellar and funds it with TOKA tokens. They assign household tasks to their kids. The kids complete them, upload a photo as proof. The parent approves. And Stellar automatically sends the TOKA tokens directly to the child's wallet — in 3 seconds, for a fraction of a peso."*

> *"No banks. No middlemen. Just programmable, verifiable, instant family payments."*

---

### 2:00 – 3:30 | Live Demo (Practice This 5 Times)

**Pre-setup before demo:**
- Two phones or two browser tabs (Anchor + Earner)
- Demo family already created with one pending task
- Vault already funded with 500 TOKA

**Demo flow:**

> *"Let me show you. I'm Nanay — I'm the family Anchor."*

1. Open Anchor dashboard → show Family Vault balance (e.g., 500 TOKA)
2. Show the task: "Wash the dishes" — 10 TOKA reward, assigned to Ate Maria

> *"And this is Ate Maria — she's 14, she just finished washing the dishes."*

3. Switch to Earner view → open the task → tap "Mark Complete" → take/upload proof photo

> *"She takes a quick photo as proof and submits it. Immediately, Nanay gets a notification."*

4. Switch back to Anchor → open Approvals → see Ate Maria's photo proof
5. Tap "Approve" → show loading indicator

> *"One tap. And watch what happens to Ate Maria's wallet."*

6. Switch to Earner wallet → show TOKA balance increasing in real time
7. Show the transaction on Stellar testnet explorer (pre-opened tab)

> *"10 TOKA. In 3 seconds. For less than a centavo in fees. That's Stellar."*

---

### 3:30 – 4:00 | Why Stellar

> *"We chose Stellar for three reasons that are non-negotiable for this market:"*

> *"First — fees. Sending ₱5 to a child is literally impossible on traditional banking or Ethereum. On Stellar, it costs $0.00001. That's not a feature, that's a breakthrough for micro-rewards."*

> *"Second — speed. 3 to 5 second finality. Kids don't want to wait 3 days for their allowance."*

> *"Third — PHPC and real-world asset support. Toka can evolve to let families save, spend, and convert their earnings through Stellar's existing financial rails — rails that already serve Southeast Asia."*

---

### 4:00 – 4:30 | The Ask / Closing

> *"Toka is in its MVP stage. What we've built this week is the core loop — the proof that this works on Stellar, with real tokens, real wallets, and real families."*

> *"The roadmap: multi-sig vault controls for OFWs, integration with PHPC for real peso-pegged rewards, and eventually, a savings and spending layer so kids can learn to grow what they earn."*

> *"Every Filipino family is already a micro-economy. Toka just puts it on the blockchain."*

> *"Salamat."* 🙏

---

## Q&A Prep

**"How do you prevent kids from faking proof photos?"**
> "For MVP, it's parent approval — the Anchor sees the photo and approves manually. The photo CID is stored on IPFS, so it's immutable and timestamped. Long-term, we can add AI-assisted verification or require GPS metadata to confirm the task location."

**"What's your monetization model?"**
> "We take a 0.5% fee on family vault top-ups — like a remittance fee, but 10–50x cheaper than banks. Alternatively, we offer premium family plans with analytics and multi-child management. We're aligned with Stellar's mission so we're exploring grants as well."

**"Why not just use GCash or PayMaya?"**
> "GCash can't do programmable, task-gated payments. You can't say 'release ₱10 to my child only if she washes the dishes and I approve a photo.' Toka adds the logic layer. And for OFWs sending from abroad, cross-border transfers on Stellar are frictionless — no conversion fees, no bank-to-bank delays."

**"Is this secure? What if the parent loses their phone?"**
> "The private key is stored in hardware-backed secure storage on the device. For the MVP, we recommend parents keep a backup of their secret key offline — the same way you'd keep a bank PIN. Post-hackathon, we plan multi-sig so a backup key can recover access."

**"Can earners spend their TOKA outside the family?"**
> "Not yet. For now TOKA is family-scoped. The next version adds a 'TOKA Marketplace' where kids can convert to PHPC or redeem for real-world items from partner merchants — aligned with the financial inclusion mission."

---

## Demo Checklist (Night Before)

- [ ] Charge both test devices to 100%
- [ ] Fund anchor testnet account with 500+ TOKA
- [ ] Fund earner testnet account with enough XLM for fees
- [ ] Pre-create "Dela Cruz Family" with invite code
- [ ] Create 2–3 pending tasks already
- [ ] Open Stellar testnet explorer in browser tab (for tx proof)
- [ ] Test the full flow end-to-end one more time
- [ ] Know your backup plan: if demo fails live, show the screen recording

---

## Slide Deck Outline (5 slides max)

| Slide | Content |
|-------|---------|
| 1 | **TOKA** logo + tagline: *"Gamifying Household Responsibility, Tokenizing Financial Literacy"* |
| 2 | **The Problem** — 3 bullet points with Philippine-specific stats |
| 3 | **The Solution** — Core loop diagram (Parent → Task → Child → TOKA) |
| 4 | **Why Stellar** — Speed / Fees / PHPC / OFW use case |
| 5 | **Traction & Roadmap** — What's built, what's next |

---

## Backup: If Live Demo Breaks

Have a 2-minute screen recording saved locally showing:
1. Creating a task
2. Submitting proof
3. Approving → balance update
4. Stellar testnet explorer showing the transaction

Say: *"Let me show you a recording from our latest testnet run while I troubleshoot — the core loop is fully functional."*

Stay calm. Judges know live demos are hard. The story and architecture matter more.
