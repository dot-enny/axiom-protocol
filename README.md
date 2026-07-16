![Stellar](https://img.shields.io/badge/Network-Stellar_Testnet-black?style=for-the-badge)
![Soroban](https://img.shields.io/badge/Smart_Contract-Soroban_Rust-black?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Frontend-Next.js_14-black?style=for-the-badge)

# AXIOM Protocol

**Cryptographic Compliance for Real-World Assets.**

Axiom is a decentralized infrastructure protocol built on the Stellar Soroban network. It allows institutions to cryptographically bind legal agreements, KYC proofs, and compliance documents to tokenized Real-World Assets (RWAs) without exposing sensitive data to a public ledger.

## The Zero-Knowledge Loop
Axiom solves the privacy friction of enterprise tokenization:
1. **Local Compute:** Documents are hashed instantly in the browser via native Web Crypto APIs.
2. **Data Sovereignty:** The raw file never touches a server.
3. **Immutable Escrow:** Only the resulting 256-bit hash is anchored to the Soroban smart contract, acting as an undeniable proof of existence.

---

## Protocol Architecture

Axiom utilizes a strict monorepo architecture, separating the client-side cryptography from the on-chain execution.

### 1. The Frontend Engine (`/frontend`)
Built with **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS** and structured under an **Institutional Brutalist** design system.
* **Zero-Knowledge Privacy:** Implements strict client-side hashing. Documents dragged into the Axiom interface are processed locally using native browser Web Crypto APIs.
* **Data Sovereignty:** Raw data never touches a server; only the resulting 256-bit hash is pushed to the network.
* **Freighter Integration:** Utilizes `@stellar/freighter-api` and `@stellar/stellar-sdk` for seamless transaction signing.
* **The Dropzone:** Client-side SHA-256 generation and Freighter wallet integration.
* **The Deal Room:** Multi-party signature coordination for complex asset escrow.
* **The Asset Vault:** A unified view of tokenized assets and their underlying compliance proofs.
* **The Developer Portal:** Headless API route generation for seamless B2B SaaS integration.

### 2. The Smart Contract (`/contracts`)
Written in Rust (`#![no_std]`) and compiled to WebAssembly for the Soroban VM.
* **Immutable Escrow:** Stores the SHA-256 hash alongside the issuer's signature and a network timestamp in Soroban Persistent Storage.
* **Deterministic Execution:** Lightweight and highly optimized to minimize network rent and execution costs.
* **State Protection:** Contracts trap and revert on duplicate hash injections to preserve the immutability of the original timestamp.
* **Cryptographic Audit Trail:** On-chain mapping of Asset Hash -> Issuer Address + Network Timestamp.

---

## Quick Start (Local Development)

### Prerequisites
* Node.js (v18+)
* Rust (`wasm32-unknown-unknown` target)
* Stellar CLI
* Freighter Browser Extension

### 1. Deploy the Contract
```bash
cd contracts
stellar keys generate admin --network testnet
stellar keys fund admin --network testnet
stellar contract build
stellar contract deploy --wasm target/wasm32-unknown-unknown/release/axiom_contract.wasm --source admin --network testnet
```
(Copy the resulting Contract ID)

### 2. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```
Create a .env.local file in the frontend directory:
```
NEXT_PUBLIC_CONTRACT_ID=YOUR_CONTRACT_ID
SERVER_SECRET_KEY=YOUR_ADMIN_SECRET_KEY
```

## Contributing
We welcome developers to help scale Axiom. [Please see our contribution guide](CONTRIBUTING.md) for architecture guidelines, open issues, and submission processes.

## Security & Design

Axiom strictly adheres to an **Institutional Brutalist** design system to reflect its status as immutable financial infrastructure. The codebase enforces strict React component composition and avoids deeply nested logic to maintain maximum auditability.

## License

MIT
