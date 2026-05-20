# 🎨 BRANDING.md — Toka Brand Guidelines

## 1. Brand Identity & Core Principles

Toka sits at the intersection of family utility and gamified web3 tech. The visual language must balance **financial trust** (for the Anchor) with **dynamic engagement** (for the Earner).

* **Trustworthy but not boring:** Avoid the sterile, corporate look of traditional banking apps.
* **Gamified but not childish:** The UI should feel like a sleek, modern interface, treating household chores with the weight of a digital quest.
* **High-Contrast Tech:** Utilize a dark, immersive canvas punctuated by vibrant, glowing accents to make interactive elements pop.

---

## 2. Color Palette

The color system relies on deep space backgrounds paired with striking neon accents to guide user attention and define roles.

### 🌌 Backgrounds (The Canvas)

* **Deep Space:** `#0A0F2C` — The primary app background. Deep, immersive, and easy on the eyes for dark mode.
* **Card Surface:** `#0F1640` — Slightly elevated background for task cards and the dashboard.
* **Glassmorphism:** `rgba(0, 229, 255, 0.08)` — Used for borders and subtle glowing overlays to create depth without clutter.

### ⚡ Accents (The Actions)

* **Anchor Cyan:** `#00E5FF` — Represents the Anchor, technology, the vault, and verified actions. Used for primary buttons, active states, and the "Submitted" status.
* **Earner Orange:** `#FF6B35` — Represents the Earner, physical action, quests, and rewards. Used to highlight pending tasks and earner-specific UI elements.

### 🚥 Semantic Colors (The Status)

* **Pending (Action Needed):** `#FFB300` (Warning/Yellow)
* **Submitted (Under Review):** `#00E5FF` (Cyan)
* **Approved (Success/Paid):** `#00E676` (Green)
* **Rejected (Error/Retry):** `#FF5252` (Red)

---

## 3. Typography

The typography system uses three distinct typefaces to separate hierarchy, storytelling, and technical data.

* **Headings & Display:** `SpaceGrotesk-Bold`
* *Usage:* Screen titles, massive TOKA balances, and bold calls-to-action. Its geometric structure feels slightly futuristic but highly legible.


* **Body & UI Elements:** `Inter-Regular`
* *Usage:* Task descriptions, standard buttons, and secondary text. It serves as the clean, neutral workhorse of the app.


* **Technical & Financial Data:** `JetBrainsMono-Regular`
* *Usage:* Stellar public keys, IPFS CIDs, and transaction hashes. The monospace font instantly communicates "immutable blockchain data" to the user.



---

## 4. Visual Style & UI Elements

### 3D Infographics & Depth

Rather than flat, vector illustrations, financial elements like the `WalletWidget` should leverage 3D infographic styles. Balances and rewards should feel tangible. Use multi-stop linear gradients (e.g., `#0F2060` to `#0A1440`) and absolute-positioned glow orbs (`rgba(0,229,255,0.1)`) behind cards to simulate depth and physical lighting.

### The Toka Mascot

The Toka mascot operates as a dynamic, contextual element rather than a static, standalone graphic taking up screen real estate. It serves as a custom cursor or an interactive, floating guide within the UI—subtly animating when hovering over a pending task, celebrating a successful IPFS upload, or pointing toward the "Approve" button to create a seamless, guided flow.

### Shape Language

* **Corner Radii:** Use rounded, friendly corners to offset the harshness of the dark tech theme. Standard cards use `16px` (lg), while major widgets use `24px` (xl).
* **Status Pills:** Fully rounded (`9999px`) to visually distinguish them from clickable rectangular buttons.

