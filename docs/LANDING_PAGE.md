# 🌐 Toka Landing Page Guide

## 1. Objective
Create a high-converting, visually stunning web landing page for **Toka**. The page should clearly explain the product's value proposition to parents and children, act as a portal for downloading the mobile app (or joining the waitlist), and serve as a polished portfolio piece for the hackathon judges.

## 2. Recommended Tech Stack
- **Framework**: Next.js (App Router) or Vite + React
- **Styling**: Tailwind CSS (for rapid, modern UI development)
- **Animations**: Framer Motion (for dynamic, playful TokaBit mascot and scroll animations)
- **Deployment**: Vercel or Netlify (free, instant CI/CD)

## 3. Page Structure & Flow

### A. Hero Section
- **Headline**: *Chores to Crypto. Empowering the Next Generation.*
- **Subheadline**: A family-friendly app where kids complete real-world tasks, submit photo proof, and earn TOKA tokens instantly on the Stellar network.
- **Primary CTA**: "Watch Demo Video" (links to YouTube/Loom)
- **Secondary CTA**: "Download App / Join Waitlist"
- **Visuals**: A sleek floating iPhone mockup displaying the Earner dashboard, interacting with a bouncing 3D/SVG TokaBit mascot.

### B. How It Works (The Core Loop)
A simple 3-step horizontal or vertical timeline layout:
1. **Assign**: Parents (Anchors) create tasks, set deadlines, and attach a TOKA reward.
2. **Complete**: Kids (Earners) finish the chore and snap a photo as undeniable proof.
3. **Earn**: Parents approve the photo, and TOKA tokens instantly transfer via secure Soroban Smart Contracts.

### C. Key Features (Grid Layout)
- 🔒 **Family Vaults**: A secure, transparent way to manage digital allowance.
- 📸 **Photo Verification**: Decentralized (IPFS-backed) photo proof so chores are actually verified.
- ⚡ **Powered by Stellar**: Lightning-fast, near-zero fee blockchain infrastructure that operates invisibly in the background.
- 🤖 **Meet TokaBit**: A digital companion that celebrates every completed milestone.

### D. For the Judges (Hackathon Context)
- **Architecture Highlight**: Briefly outline the stack (React Native Expo, Node.js, SQLite, Soroban Smart Contracts, IPFS).
- **Links**: Buttons linking to the GitHub Repository, Smart Contract Explorer link, and the Pitch Deck.

### E. Footer
- Links to Socials (Twitter, LinkedIn), Privacy Policy, and Terms of Service.

## 4. Design & Aesthetics
To ensure a premium, wow-factor experience:
- **Color Palette**: Inherit from the mobile app. Use the dark theme (`#0F172A` or similar deep background) to give a sleek Web3 feel.
  - Primary accents: **Cyan** (`#00F0FF`) and **Orange** (`#FF6B35`).
- **Typography**: Modern, geometric sans-serif fonts (e.g., *Outfit*, *Space Grotesk*, or *Inter*).
- **Styling Techniques**:
  - **Glassmorphism**: Use semi-transparent backgrounds with blur effects for cards to match the app's `WalletWidget`.
  - **Gradients**: Subtle glowing radial gradients behind the phone mockups.
  - **Micro-interactions**: Buttons should scale up slightly on hover, and the TokaBit mascot should have a continuous gentle floating animation.

## 5. Step-by-Step Implementation Plan
1. **Initialize**: Run `npm create vite@latest toka-landing -- --template react-ts` (or Next.js).
2. **Tailwind Setup**: Configure `tailwind.config.js` with your custom Cyan and Orange brand colors.
3. **Assets**: Export high-res screenshots of the mobile app (Dashboard, Approvals screen) and the TokaBit mascot emoji/graphic.
4. **Build Components**: Start with the Nav Bar and Hero section, ensuring it looks perfect on mobile and desktop.
5. **Animate**: Wrap feature cards in Framer Motion `<motion.div>` tags to fade in as the user scrolls down.
6. **Deploy**: Push to GitHub and connect the repo to Vercel for a live URL you can share at Demo Day.
