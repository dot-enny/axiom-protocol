# Axiom Protocol — Project State

This file is the running memory for Claude across sessions. Update the
"Built so far" and "Not built yet" sections at the end of every session.

## Architecture

Monorepo: `frontend/` (Next.js 14 App Router, TypeScript, Tailwind v3) +
`contracts/` (Rust/Soroban, single `cdylib` crate — see below).
Design system is Institutional Brutalism, defined in `.clauderules` —
monochrome, sharp 1px borders, no gradients/soft shadows/rounded
corners, enforced at the Tailwind config level (not just convention).

## Built so far

**Session 1 — Landing page scaffold**
Next.js 14.2.35 scaffold (TypeScript, Tailwind v3, ESLint). Static
landing page — Navbar, Hero, TickerStrip, FeaturesSection ("How It
Works"), Footer — composed in `frontend/app/page.tsx`. Typography is
Archivo (display/body) + IBM Plex Mono (labels/data) via
`next/font/google`.

**Session 1.5 — Animation system + expanded landing content**
Added `framer-motion`, wrapped in three constrained primitives under
`frontend/components/motion/`: `SnapIn` (harsh linear reveal, no
spring/fade), `GridLine` (grid dividers snapping in), `Typewriter`
(terminal-style character reveal). Expanded the landing page with
Network Metrics, RWA Use Cases, and a dark Terminal developer CTA
section.

**Session 2 — Dashboard route (2026-07-05)**
New route at `frontend/app/dashboard/page.tsx` — the core application
interface, under `frontend/components/dashboard/`:
- `sidebar.tsx` — responsive: a full-height left sidebar with the
  AXIOM wordmark and a placeholder "Connect Wallet" button at
  desktop widths, collapsing to a horizontal top bar on mobile.
- `dropzone.tsx` + `verification-workspace.tsx` — a stark dashed-border
  drop target (click-to-browse also works via a hidden file input).
  No real hashing — dropping a file just captures its name and flips
  shared `idle | processing | done` state, lifted into
  `verification-workspace.tsx` since Dropzone and TerminalConsole are
  siblings that need to react to the same event.
- `terminal-console.tsx` — dark monospace log panel. On "processing"
  it plays a fixed sequence of `[SYSTEM]/[CRYPTO]/[SOROBAN]` lines
  with staggered `setTimeout`s (550ms apart), each revealed via
  SnapIn; the "digest" shown is a `Math.random()` hex string, not a
  real hash. Calls back to flip status to "done" once the sequence
  finishes.
- `verification-ledger.tsx` + `ledger-row.tsx` — harsh 1px bordered
  table, mock anchor data (hash/timestamp/issuer, all truncated with
  a middle-ellipsis helper), horizontally scrollable on narrow
  viewports rather than squeezing columns.

Also fixed a real bug while here: the landing page's "Launch App"
button pointed to `/app` (a Session 1 placeholder route that was
never built). It now points to `/dashboard`, the route that actually
exists.

**Session 3 — Soroban smart contract (2026-07-06)**
`contracts/` is now a real Rust crate (`cargo init --lib`, single
`cdylib` package — not a multi-contract `stellar contract init`
workspace). `soroban-sdk = "26"` (resolved 26.1.0). Release profile
matches the current official Soroban template exactly: `opt-level =
"z"`, `overflow-checks = true`, `panic = "abort"`, `codegen-units =
1`, `lto = true`, `strip = "symbols"`.

`src/lib.rs` implements the compliance-anchor contract:
- `ComplianceRecord` (`#[contracttype]`): `timestamp: u64` +
  `issuer: Address`.
- `AxiomContract::anchor_proof(env, hash: String, issuer: Address)` —
  requires `issuer.require_auth()`, panics if `hash` is already in
  persistent storage (write-once, never silently overwritten),
  otherwise stores a new `ComplianceRecord` and extends its TTL
  (~30 day window, re-extended within ~1 day of expiry — see the
  `DAY_IN_LEDGERS`/`TTL_EXTEND_TO`/`TTL_THRESHOLD` constants).
- `AxiomContract::verify_proof(env, hash: String) -> Option<ComplianceRecord>` —
  read-only lookup, `None` if never anchored (deliberately not a
  panic, so the frontend can query speculatively).

Verified by actually compiling: `stellar contract build` produces
`target/wasm32v1-none/release/axiom_contract.wasm` (1,697 bytes),
exporting exactly `anchor_proof` and `verify_proof`. No unit tests
written yet (not asked for this session).

Before writing any of this, the current soroban-sdk source (v26.1.0,
fetched via `cargo fetch`) and a throwaway `stellar contract init`
reference project were inspected directly rather than trusting
training-data memory of the API — Soroban's SDK moves fast enough
that this mattered. One correction it caught: the `#[contracttype]`
doc comment claims a 10-character limit on field/type names, but the
actual macro source (`derive_struct.rs`) enforces 30 — the doc is
stale. `ComplianceRecord`/`timestamp`/`issuer` are fine either way,
but this would matter for future contract work with longer names.

**Known environment quirk (this machine only):** `stellar contract
build` fails linking host build-scripts unless a real GNU mingw64
`bin` (not the llvm-mingw one earlier in PATH) is prepended for that
command — see `contracts/README.md`. Not fixed at the system or repo
config level since the fix path is machine-specific; documented
instead of baked into a fragile committed config.

**Session 4 — Real client-side SHA-256 hashing (2026-07-07)**
The dashboard's hashing is no longer simulated. `frontend/lib/hash.ts`
(`sha256Hex`) reads a dropped `File` as an `ArrayBuffer` and hashes it
with `crypto.subtle.digest("SHA-256", ...)` — the file's bytes never
leave the browser, no server round-trip. `verification-workspace.tsx`
now awaits this before flipping `status` to `"processing"`, so by the
time `TerminalConsole` starts its staged log reveal, the real hash is
already in hand; the "dramatic" `setTimeout` pacing (550ms/line) is
purely theatrical narration of work that already finished, not a
simulation of it. Terminal sequence is now exactly the four requested
lines — `[SYSTEM] Intercepting...`, `[CRYPTO] Computing...`, `[CRYPTO]
Hash generated: {realHash}`, `[NETWORK] Ready for Soroban anchor.` —
replacing the old random-hex mock.

`VerificationWorkspace` also gained an "Anchor to Soroban" `Button`
below the Dropzone/Terminal grid, disabled until `status === "done"`
(no click handler yet — Task 3 was explicitly UI-state only). `Button`
itself got `disabled:` variants (`opacity-30`, `pointer-events-none`)
since it previously had no disabled styling at all.

Fixed a real inconsistency while here: Dropzone's completed state
said "Status: Anchored", which was never true even in the old mock
flow — hashing and anchoring are different steps, and anchoring still
doesn't happen anywhere. Now reads "Status: Hash Ready" and shows the
truncated hash. Extracted `truncateMiddle` out of `ledger-row.tsx`
into `frontend/lib/format.ts` so Dropzone could reuse it instead of
duplicating.

Verified for real, not just type-checked: dropped a file with known
content into the running dashboard via Playwright (system Chrome —
see the Session 1/3 notes on this machine's Playwright browser-download
issues) and compared the hash shown in the terminal against an
independently-computed `sha256sum` of the same file. They matched
exactly. Also confirmed the Anchor button is disabled before the drop
and enabled only after the log sequence completes.

**Session 5 — Freighter wallet integration (2026-07-08)**
`@stellar/freighter-api` (v6.0.1) and `@stellar/stellar-sdk` (v16.0.1)
installed. Checked the actually-installed type definitions before
writing anything, same discipline as Session 3's soroban-sdk check —
freighter-api v6 removed `getPublicKey()` entirely in favor of
`getAddress()` (same purpose, returns `{ address }` instead of a raw
string), and every call returns `{ ...data, error? }` rather than
throwing. `frontend/lib/wallet.ts` (`connectFreighterWallet`) adapts
that return-based pattern into a throw-based one so the calling React
code can use plain try/catch.

Wallet state is lifted into a context — `wallet-context.tsx`
(`WalletProvider` + `useWallet()`) — rather than component props,
since the connector lives in the sidebar while the pieces that need
to *react* to connection state (Dropzone, VerificationWorkspace) are
siblings under `app/dashboard/page.tsx`. The page itself stays a
Server Component (needed for its `metadata` export); `WalletProvider`
is the client boundary wrapping its children.

`wallet-connector.tsx` replaces the old static "Connect Wallet"
`Button` in the sidebar with one that reflects real state:
idle/connecting/error text on the button itself, and once connected,
a non-interactive bordered badge showing the truncated address
(`GABC…1234` — Freighter has no programmatic "disconnect").

`frontend/lib/soroban.ts` builds a real, validly-encoded (but
never-submitted) Soroban `anchor_proof` invocation entirely offline —
`Account(address, "0")` with a placeholder sequence number, no RPC
round-trip. Contract ID is a placeholder too, but had to be a
syntactically valid strkey (`StrKey.encodeContract(Buffer.alloc(32))`)
rather than the literal truncated `'CAC...'` from the task, since
`Contract`'s constructor validates the checksum. The invocation
passes both `anchor_proof` arguments (hash + issuer as an `Address`
ScVal) to actually match the Session 3 contract's real signature,
even though nothing here calls the real thing yet.

"Anchor to Soroban" (`verification-workspace.tsx`) now: guards on
`status === "done"` AND a connected wallet (button `disabled` covers
both); on click, appends `[NETWORK] Building Soroban transaction...`
to the terminal, builds the XDR, appends `[NETWORK] Requesting
Freighter signature...`, then really calls freighter-api's
`signTransaction()` — this is a real wallet popup, not simulated —
and appends either `[SOROBAN] Transaction signed and submitted.` or a
failure line depending on the result. Terminal's own hash-reveal
`useEffect` (Session 4) was left untouched; a new `extraLines` prop
is just concatenated onto its internally-managed lines, so the two
sequences (hash reveal, then anchor signing) coexist in one log
without entangling their timing logic.

Dropzone now reads `useWallet()` too and shows "Connect wallet to
anchor" once a hash is ready but no wallet is connected, satisfying
the task's "Dropzone knows if a wallet is connected" requirement
concretely rather than just having the state technically reachable.

Verified for real: Playwright + system Chrome against the running
dev server. Freighter genuinely isn't installed in that browser,
which incidentally exercised the real error path — clicking "Connect
Wallet" correctly surfaced "Freighter extension not found." and the
button flipped to "Retry Connection." Then dropped a known-content
file and confirmed the hash matched an independently-computed
`sha256sum` (unchanged from Session 4 — no regression), and confirmed
"Anchor to Soroban" stayed disabled throughout since the wallet never
connected, with the Dropzone hint visible. Zero console errors across
the whole flow.

## Not built yet

- The Soroban contract exists and compiles but is not deployed to
  any network (no testnet/mainnet contract ID exists yet). The
  frontend's `anchor_proof` invocation is real XDR built against a
  placeholder contract ID and gets a real Freighter signature, but
  nothing is ever submitted to an RPC endpoint — signing is as far as
  the pipeline goes.
- No auth, no backend.
- The Verification Ledger is static mock data — nothing reads from
  Soroban or any backend yet.
- No contract unit tests yet.
- Not tested against a real Freighter installation (this machine
  doesn't have the extension) — only the "not installed" error path
  and the pre-connection UI states were verified live. The
  connected/signing/success paths are implemented per the verified
  freighter-api v6 type signatures but unexercised by a real popup.
