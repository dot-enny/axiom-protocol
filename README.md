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
* **Dynamic m-of-n Escrow:** Stores the SHA-256 hash alongside a dynamic vector of authorized signers and a required execution threshold.
* **Deterministic Execution:** Lightweight and highly optimized to minimize network rent and execution costs.
* **State Protection:** Contracts trap and revert on duplicate hash injections to preserve the immutability of the original timestamp.
* **Cryptographic Audit Trail:** On-chain mapping of Asset Hash -> Signer Matrix + Network Timestamp.

### Dynamic Escrow & Valuation

Axiom's anchor configuration adapts to the shape of the underlying agreement, from a single self-attesting party to a fully independent three-party escrow — and keeps financial and non-financial proofs strictly separated so protocol-wide value metrics stay meaningful.

* **Self-Attestation (1-Party):** Immediate cryptographic timestamping for proprietary algorithms and IP.
* **Bilateral Agreements (2-Party):** Zero-knowledge, mathematically undeniable vesting and scope-of-work contracts.
* **Institutional Escrow (3-Party):** Trustless execution for High-Value RWAs requiring independent auditor verification.
* **Dynamic TVL:** Strict separation of financial assets (e.g., T-Bills) and non-financial compliance proofs (e.g., KYC policies) to maintain protocol metric integrity.

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
Create a `.env.local` file in the frontend directory:
```
NEXT_PUBLIC_CONTRACT_ID=YOUR_CONTRACT_ID
SERVER_SECRET_KEY=YOUR_ADMIN_SECRET_KEY
```

## Developer SDK — Headless B2B Infrastructure

Axiom isn't only a dashboard — it's compliance infrastructure other institutions'
backends can integrate directly. `@axiom/sdk` (`/sdk`) is a lightweight TypeScript
client that wraps the same `/api/v1/anchor` endpoint the dashboard itself calls,
letting any Node.js or Edge service anchor a document hash headlessly, with no
browser, no wallet extension, and no UI in the loop.

```ts
import * as path from "path";
import { randomBytes } from "crypto";
import * as dotenv from "dotenv";
import { AxiomClient, AxiomAPIError } from "@axiom/sdk";

// Loaded mainly so SERVER_SECRET_KEY is available in process.env if a
// future example needs it — the SDK itself only ever needs the apiKey.
dotenv.config({ path: path.resolve(__dirname, "../frontend/.env.local") });

// The route only checks a Bearer token's *shape* (`ax_live_` prefix),
// not a real issued/revocable key yet — see STATE.md "Not built yet".
// This mirrors the same placeholder format the Developer Portal
// generates client-side.
const MOCK_API_KEY = "ax_live_dev_00000000000000000000000000000000";

// A syntactically valid Stellar public key, standing in for whatever
// institution's address a real integrator would pass here.
const DUMMY_ISSUER = "GC5VAGVVDESX3OMJB6WI4IQDDYCQPFXKGZYRAIBW66NZVXEH7G63NLBQ";

function dummyDocumentHash(): string {
  return randomBytes(32).toString("hex");
}

(async () => {
  console.log("[SYSTEM] INITIALIZING AXIOM SDK...");

  const client = new AxiomClient({
    apiKey: MOCK_API_KEY,
    environment: "testnet",
  });

  try {
    // V2 Execution: Hash, Signers Array, Threshold
    const receipt = await client.anchorDocument(
      dummyDocumentHash(),
      [DUMMY_ISSUER], 
      1               
    );
    console.log("[SOROBAN] Anchor confirmed. Receipt:");
    console.log(JSON.stringify(receipt, null, 2));
  } catch (err) {
    if (err instanceof AxiomAPIError) {
      console.log(
        `[FAILURE] AxiomAPIError (status ${err.status}): ${err.message}`
      );
    } else {
      console.log("[FAILURE] Unexpected error:", err);
    }
  }
})();
```

This exact script lives at [`examples/node-test.ts`](examples/node-test.ts). Run it
for real:

```bash
cd sdk && npm install && npm run build
cd ../examples && npm install && npm install ../sdk && npm start
```

A successful run anchors on Stellar Testnet and prints a real receipt:

```json
{
  "transactionId": "9cd9d226bdffa7374691f9673c3d5bf3e5d0db02a02a9eb166bde14e0eae8674",
  "hash": "8da03be3345d084c084342fe84d37f05b182e994f2dbd6da8f039a933604b1b8",
  "status": "confirmed",
  "network": "stellar-testnet",
  "contractId": "CCO6FJTO6E6KWHTICBG6AISDJRQ4TELNEWV5FX7TUQCTPVD4RZ2BCAVK",
  "timestamp": 1784362074
}
```

## Contributing
We welcome developers to help scale Axiom. [Please see our contribution guide](CONTRIBUTING.md) for architecture guidelines, open issues, and submission processes.

## Security & Design

Axiom strictly adheres to an **Institutional Brutalist** design system to reflect its status as immutable financial infrastructure. The codebase enforces strict React component composition and avoids deeply nested logic to maintain maximum auditability.

## License

MIT
