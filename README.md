# AXIOM Protocol

**Cryptographic Compliance for Real-World Assets.**

Axiom is a decentralized infrastructure protocol built on the Stellar Soroban network. It allows institutions to cryptographically bind legal agreements, KYC proofs, and compliance documents to tokenized Real-World Assets (RWAs) without exposing sensitive data to a public ledger.

---

## Architecture

Axiom utilizes a strict monorepo architecture, separating the client-side cryptography from the on-chain Soroban escrow.

### 1. The Frontend (`/frontend`)

Built with **Next.js 14** (App Router), **TypeScript**, and **Tailwind CSS**.

* **Zero-Knowledge Privacy:** Implements strict client-side hashing. Documents dragged into the Axiom interface are processed locally using native browser Web Crypto APIs.
* **Data Sovereignty:** Raw data never touches a server; only the resulting 256-bit hash is pushed to the network.
* **Freighter Integration:** Utilizes `@stellar/freighter-api` and `@stellar/stellar-sdk` for seamless transaction signing.

### 2. The Smart Contract (`/contracts`)

Written in **Rust** (`#![no_std]`) and compiled to WebAssembly for the Soroban Virtual Machine.

* **Immutable Escrow:** Stores the SHA-256 hash alongside the issuer's signature and a network timestamp in Soroban Persistent Storage.
* **Deterministic Execution:** Lightweight and highly optimized to minimize network rent and execution costs.

---

## Local Development

### Prerequisites

* Node.js (v18+)
* Rust
* Stellar CLI
* `wasm32-unknown-unknown` target

### Running the Frontend

```bash
cd frontend
npm install
npm run dev

```

### Building the Contracts

```bash
cd contracts
stellar contract build

```

---

## Security & Design

Axiom strictly adheres to an **Institutional Brutalist** design system to reflect its status as immutable financial infrastructure. The codebase enforces strict React component composition and avoids deeply nested logic to maintain maximum auditability.

## License

MIT
