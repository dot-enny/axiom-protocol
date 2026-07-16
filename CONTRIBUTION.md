# Contributing to Axiom Protocol

First off, thank you for considering contributing to Axiom. Our goal is to build the standard for decentralized, zero-knowledge compliance infrastructure on the Stellar network.

## The Axiom Engineering Philosophy
Axiom is institutional software. We prioritize strict auditability, deterministic execution, and privacy above all else. 
* **Zero-Knowledge by Default:** Client-side cryptography is mandatory. Raw data must never leave the browser sandbox.
* **Institutional Brutalism:** Our frontend adheres to a strict, stark, black-and-white design system. Function over form. No unnecessary animations, no color gradients.
* **Immutable Storage:** Soroban smart contracts must be optimized for minimal footprint and absolute state security.

## How Can I Contribute?

### 1. "Good First Issues" (Community Onboarding)
If you are new to Web3 or Next.js, look for issues tagged `good-first-issue`. These typically involve:
* **UI/UX Polish:** Enforcing ARIA accessibility labels across our Brutalist interface.
* **Error Handling:** Translating raw Soroban VM traps into human-readable frontend toasts.
* **Documentation:** Improving our TSDoc comments for client-side cryptography.

### 2. Frontend & Next.js Core
We are actively expanding the "Illusion of Scale" into functional reality.
* **Local State Management:** Enhancing our `localStorage` hooks to support multi-wallet historical data.
* **PDF Engine Upgrades:** Adding dynamic QR codes (linking to Stellar Expert) to our `jsPDF` receipt generator.
* **Wallet Adapter Integration:** Expanding support beyond Freighter to Albedo and xBull.

### 3. Smart Contract & Protocol (Rust)
For senior Rust engineers, we have high-bounty architectural challenges.
* **Multi-Signature Escrow (V2):** Upgrading the Soroban contract to require m-of-n signatures (e.g., Buyer, Seller, Auditor) before state commits.
* **Test Coverage:** Writing deterministic unit tests using `soroban-sdk` test utilities.

## Submission Process
1. Fork the repository and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. Ensure the test suite passes (`npm run build` in frontend, `stellar contract build` in contracts).
4. Issue that pull request! Please include a detailed description of the architecture changes and screenshots if UI is modified.
