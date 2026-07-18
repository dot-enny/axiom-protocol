# Axiom Protocol — Project State

This file is the running memory for Claude across sessions. Update the
"Built so far" and "Not built yet" sections at the end of every session.

## Architecture

Monorepo: `frontend/` (Next.js 14 App Router, TypeScript, Tailwind v3) +
`contracts/` (Rust/Soroban, single `cdylib` crate — see below) +
`sdk/` (`@axiom/sdk`, standalone TypeScript package wrapping the
`/api/v1/anchor` REST API for external Node/Edge integrators — see
below).
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

(Two follow-up fixes after Session 5, not logged as their own numbered
sessions: wallet connection errors were only ever set as a Button
`title` attribute — invisible unless hovered — now rendered as visible
text and also logged to the Terminal Console; and a missing Freighter
extension now shows "Stellar wallet required." plus a real
Button-styled link to freighter.app instead of a dead-end "Retry".)

**Session 6 — Real Testnet integration (2026-07-11)**
The contract is genuinely deployed now: `frontend/.env.local` (gitignored,
per Next.js convention — must be recreated in any other environment or CI)
sets `NEXT_PUBLIC_CONTRACT_ID=CCO6FJTO6E6KWHTICBG6AISDJRQ4TELNEWV5FX7TUQCTPVD4RZ2BCAVK`.

`lib/soroban.ts` no longer builds an offline, never-submitted transaction
against a placeholder account and contract ID. It now:
- `buildAnchorProofTransaction` fetches the real account (real sequence
  number) via `rpc.Server.getAccount`, and targets the real contract ID
  from the env var.
- `prepareAnchorProofTransaction` calls `server.prepareTransaction`,
  which simulates against the network and assembles the correct
  resource fee/footprint. If the contract would panic (e.g. this hash
  is already anchored), this throws with the simulation's own message —
  confirmed by reading the SDK source directly
  (`rpc/server.js`: `prepareTransaction` catches `Api.isSimulationError`
  and re-throws `new Error(simResponse.error)`), not assumed.
- `submitSignedTransaction` reconstructs the signed `Transaction` from
  Freighter's returned XDR (`TransactionBuilder.fromXDR`) and calls
  `server.sendTransaction`.
- `confirmTransaction` polls with the SDK's built-in
  `server.pollTransaction` (30 attempts, ~1s apart) rather than a
  hand-rolled retry loop, and throws unless the final status is
  literally `SUCCESS`.

`VerificationWorkspace`'s anchor click handler wraps the whole
simulate → sign → submit → confirm sequence in one try/catch, logging
the four lines from the task spec at each stage and funneling every
possible failure (simulation panic, signature rejection, network
rejection, confirmation timeout) into the same
`[ERROR] Transaction failed: {message}` format with the real message
from whichever stage failed — no success state is set unless
`confirmTransaction` actually returns without throwing.

Verified as thoroughly as this environment allows, in three layers:
1. Lint/build clean, and a browser regression pass confirmed the
   parts reachable without a real wallet still work (wallet-missing
   guidance, real SHA-256 hashing) — same as prior sessions.
2. A standalone Node script confirmed real RPC connectivity (Testnet
   health check) and that the contract ID is genuinely deployed:
   `getContractWasmByContractId` returned 1,697 bytes — the exact
   size recorded when this WASM was compiled locally in Session 3,
   strong evidence it's the same build.
3. Because this machine has no real Freighter installation (same
   limitation noted in Session 5), the actual signing popup couldn't
   be driven directly. Instead, ran the *entire real pipeline*
   end-to-end outside the browser: generated a fresh keypair, funded
   it via Stellar's Friendbot testnet faucet, then used
   `lib/soroban.ts`'s exact build/prepare logic, signed with the raw
   keypair in place of Freighter (identical XDR-signing mechanics,
   different signer), submitted, and polled to a genuine `SUCCESS`.
   Confirmed the write actually landed by calling `verify_proof`
   read-only afterward — it returned the real issuer address and
   ledger timestamp. This exercises everything except the Freighter
   popup itself, which is the one piece that genuinely requires the
   browser extension to test.

**Session 7 — PDF compliance receipt (2026-07-14)**
`jspdf` (v4.2.1) installed. `frontend/lib/pdf.ts`
(`downloadComplianceReceipt`) builds a one-page A4 receipt entirely in
courier, black-on-white — no color anywhere, matching the design
system even on paper: a bold tracked header ("AXIOM PROTOCOL" /
"// CRYPTOGRAPHIC COMPLIANCE RECEIPT"), a solid black divider bar
(`rect(..., 'F')`, not a hairline `line()` — reads harsher), the five
required fields (hash, network, contract ID, issuer, UTC timestamp of
the anchor) each as a small tracked label over its value, a second
divider, and a footer disclaimer that the PDF is a local record and
the chain itself is the source of truth. Field values use `maxWidth`
wrapping as a safety net, but at the chosen font size a 64-character
hash and 56-character Stellar addresses/contract IDs all fit on one
line without wrapping.

`VerificationWorkspace` now tracks anchor confirmation as its own
piece of state (`anchorResult: { timestampIso } | null`), set right
after `confirmTransaction` resolves (real UTC time of confirmation,
not a placeholder) and cleared whenever a new file is dropped. Once
set, the bottom-bar button swaps from "Anchor to Soroban" to "Download
Receipt" — anchoring again isn't a meaningful action once it already
succeeded, so this replaces rather than adds a button. The download
handler reads `NEXT_PUBLIC_CONTRACT_ID` directly (same pattern as
`lib/soroban.ts`) rather than threading it through as a prop.

Verified for real, in two parts, since completing an actual anchor in
this browser still requires Freighter (not installed here — same gap
as Sessions 5/6):
1. Generated a real PDF with `lib/pdf.ts`'s exact logic (replicated
   in a throwaway Node script, since path-aliased TS can't be
   `import`ed directly into plain Node) using realistic sample data,
   wrote it to disk, and read it back — confirmed layout, black
   dividers, courier font, and all five fields render exactly as
   intended with nothing cut off.
2. Browser regression pass confirmed the "Download Receipt" button
   correctly does *not* appear before anchoring (only "Anchor to
   Soroban" is visible), and that hashing and wallet-missing guidance
   are unaffected. The swap-on-confirmation behavior itself is
   implemented and code-reviewed but, like the Freighter signing
   popup it depends on, unexercised live in this environment.

**Session 8 — Public verification portal (2026-07-15)**
New public route at `frontend/app/verify/page.tsx` — no wallet, no
sidebar, just `Frame` + a centered `VerifyPanel`. This is the first
route in the app that reads from the live contract without ever
requiring a signature.

`lib/soroban.ts` gained `queryVerifyProof(hash)`, a genuinely
read-only call: it builds a `verify_proof` invocation and calls
`server.simulateTransaction` directly (never `prepareTransaction` /
`sendTransaction` — nothing is submitted, so there's no fee and no
ledger write). The transaction still needs *some* syntactically valid
source account to build a legal envelope, so a fresh throwaway
`Keypair.random()` is minted per page load purely for that purpose —
it never signs anything and doesn't need to exist on-chain, since
simulation doesn't validate the source account. Confirmed this by
reading the RPC response types directly (`rpc.Api.isSimulationError` /
`isSimulationSuccess`, `SimulateTransactionSuccessResponse.result.retval`)
rather than assuming, same discipline as prior sessions. The contract's
`Option<ComplianceRecord>` return decodes via `scValToNative`: present
as a `{ timestamp, issuer }` object when found, `undefined` when the
option was `None` — both map to `queryVerifyProof` returning `null`.

`components/verify/verify-panel.tsx` is a single client component
(input + button + result, per the task's minimal-file spirit — no
sub-components needed for something this small): a heavy 2px-bordered
input for the 64-char hex hash, a `[NETWORK] Scanning blocks...`
loading line while the RPC call is in flight, and two terminal result
states — a massive inverted (white-on-black) `VERIFIED: ANCHOR RECORD
FOUND` block with the real issuer address and a real UTC timestamp
decoded from the ledger's `u64`, or a stark bordered `REJECTED: NO
MATCH ON LEDGER` block, used for both "never anchored" (business
outcome) and actual RPC/network failures — a small `[ERROR]` detail
line is appended in the latter case so real failures aren't fully
indistinguishable from a legitimate miss, without contradicting the
task's two-state spec. A lightweight client-side format check (64 hex
chars) catches obvious paste mistakes before spending an RPC round
trip.

Verified for real, in two layers, and this is the first session where
the *entire* feature could be exercised genuinely end-to-end — no
Freighter gap here, since the whole point is that it needs no wallet:
1. A standalone Node script ran the exact `queryVerifyProof` logic
   against live Testnet: a freshly-generated hash that was never
   anchored correctly returned `null`; a second hash was actually
   anchored via a funded Friendbot keypair (fresh `anchor_proof` call,
   polled to real `SUCCESS`), and querying it back returned the exact
   issuer address and a timestamp within seconds of real time.
2. Playwright + system Chrome against the running dashboard drove all
   three UI states in the real browser hitting the real RPC: malformed
   input surfaces the format warning without ever calling the network;
   the never-anchored hash resolves to the "Rejected" block; the hash
   anchored in step 1 resolves to "Verified" with the matching issuer
   address rendered on screen. Zero console errors throughout.

**Session 9 — Unified navigation layout (2026-07-15)**
The sidebar is no longer a dashboard-only component wired up inside a
single page — it's now a persistent layout shared by every
authenticated-feeling route. `frontend/app/(platform)/layout.tsx` is a
new route group layout (the `(platform)` folder name doesn't affect
URLs — `/dashboard` and `/verify` are unchanged) that owns
`WalletProvider` + `Frame` + `AppSidebar` once; `app/(platform)/dashboard/page.tsx`
and `app/(platform)/verify/page.tsx` (moved from the old top-level
`app/dashboard/` and `app/verify/`) now render only their own content,
no chrome. This means wallet connection state genuinely persists
across client-side navigation between `/dashboard` and `/verify` now
— confirmed live, not just structurally, since Next.js layouts don't
remount on a route change within the same group.

The old `components/dashboard/sidebar.tsx` (dashboard-only, no nav)
is gone, replaced by `components/layout/app-sidebar.tsx` +
`components/layout/sidebar-nav.tsx` — split out because the nav list
needs `usePathname` (client-only) while the sidebar shell itself has
no reason to be a client component. Three links: **Dashboard**
(`/dashboard`), **Verify Ledger** (`/verify`), and **Ledger Explorer**
(external, `stellar.expert`'s Testnet contract page for the real
deployed contract ID, `target="_blank"` + `rel="noopener noreferrer"`
+ a trailing `↗` glyph). The active internal link gets a solid
black/white inversion plus a trailing `→`; external never counts as
"active" since it doesn't correspond to an app route. Responsive:
desktop stacks the three links as full-width rows in the vertical
rail; mobile lays them out as an equal-width row with vertical
dividers directly under the brand bar, still above the wallet
connector — kept the mobile "collapses to a horizontal bar" spirit
from Session 2 rather than just hiding nav below `md:`.

Verified for real: typecheck/lint/build all clean after the file
moves (had to clear a stale `.next/types` cache once, from routes
that no longer exist at their old paths — not a real error). Browser
regression via Playwright + system Chrome hit both routes: exactly
one nav link is ever styled active at a time (confirmed by screenshot,
not just class-string matching — an early assertion using
`class.includes("bg-black")` gave a false positive because the
*inactive* style's own `hover:bg-black` contains that substring, a bug
in the test script, not the component), the external link's `href`/
`target`/`rel`/glyph are all correct, and clicking the sidebar's
`/verify` link (real client-side nav, not `page.goto`) carried the
existing wallet-missing guidance across unchanged. Also screenshotted
the mobile layout to confirm the nav row and full-width wallet button
render legibly at a 390px viewport.

**Session 10 — Developer API portal (2026-07-15)**
New route `frontend/app/(platform)/developers/page.tsx` (placed inside
the Session 9 `(platform)` route group, not a stray top-level
`app/developers/`, so it inherits the persistent sidebar/wallet layout
for free — same URL the task asked for, `/developers`). A fourth
sidebar link, "Developer API", was added to `sidebar-nav.tsx`
alongside Dashboard/Verify Ledger/Ledger Explorer, participating in
the same active-link highlighting.

Three sections under `components/developers/`, each opening with a
shared `SectionHeader` (`// LABEL` + bold heading, matching the
Ledger's existing section-header convention) and separated by harsh
1px borders:
- **`api-credentials.tsx`** (client component — the only interactive
  section): "Generate API Key" simulates a brief loading state, then
  mints a key client-side via `crypto.getRandomValues` (`ax_live_` +
  32 hex chars) — not hardcoded, so every click produces a
  genuinely different-looking key, consistent with this project's
  running preference for real Web Crypto over `Math.random()` even
  for admittedly mocked features. A monospace read-only input shows
  the key with an adjacent "Copy" button wired to the real
  `navigator.clipboard` API (verified by reading the clipboard back
  in a real browser, not just checking the button click fired).
  "Regenerate Key" replaces the button once a key exists.
- **`api-docs.tsx`** (static): two dark terminal-style code blocks
  (same dot-header chrome as the dashboard's `TerminalConsole`) for
  the mock `POST /v1/anchor` request and its `200 OK` response, exact
  content from the task spec including the real deployed contract ID
  in the response's `ledger.contract_id`.
- **`infrastructure-status.tsx`** (static): a two-column grid — Rate
  Limits (`Tier: Institutional`, `0 / 10,000 requests per minute`,
  plus a zero-filled usage bar) and Webhooks (`Endpoint URL: None
  configured` and a disabled "Add Webhook" button using `Button`'s
  existing `disabled:` styling from Session 4).

One real bug found and fixed during verification, not just cosmetic:
adding a fourth sidebar link broke the mobile nav row two ways in
sequence. First, the row's flex children didn't have `min-w-0`, so
Tailwind's default flex-item `min-width: auto` refused to let "Ledger
Explorer" shrink, and it overflowed off the right edge of a 390px
viewport instead of wrapping — caught by an actual mobile screenshot,
not just a visibility assertion (which would have passed regardless,
since the element was still technically in the DOM and "visible").
Fixing the outer row's `min-width` surfaced a second, nested instance
of the exact same bug: the label `<span>` inside each link is *itself*
a flex item (of the row's internal flex layout) and also needed its
own `min-w-0` before it would wrap instead of spilling text into
neighboring nav cells. Once both were fixed, labels still broke
mid-word ("DASHBOA/RD") at 4-equal-columns width, so the mobile row's
type was tightened (`text-[11px] tracking-normal`, unchanged at `md:`)
to fit whole words. Re-screenshotted after each fix to confirm, rather
than trusting the diff.

Verified for real: typecheck/lint/build clean; Playwright + system
Chrome exercised the actual clipboard (wrote via the UI, read back via
`navigator.clipboard.readText()`, confirmed an exact match), confirmed
regenerating produces a different key from the first, confirmed both
code blocks contain the exact expected request/response text including
the real contract ID, confirmed the webhook button is genuinely
`disabled` (not just styled to look inactive), and screenshotted both
desktop and mobile layouts after fixing the nav overflow bugs above.

**Session 11 — Deal Room multi-sig simulation (2026-07-15)**
New route `frontend/app/(platform)/deal-room/page.tsx` (again placed
inside the shared `(platform)` group rather than nested under
`/dashboard/pending`, for the same reason as Session 10's Developer
API route — it's a top-level nav destination, and the group gives it
the persistent sidebar for free). A fifth sidebar link, "Deal Room",
carries a static `[ 1 PENDING ]` badge — hardcoded rather than wired
to real deal count, deliberately: there's no shared state between the
sidebar and the Deal Room's mock data, and adding one just to make a
static badge dynamic would be exactly the kind of premature plumbing
this project avoids.

`components/deal-room/` holds two views orchestrated by
`deal-room-workspace.tsx` (client, lifted state — same shape as
`VerificationWorkspace`): a **Pending Queue** table (`pending-queue.tsx`)
listing the one mock deal (hash, asset type, required sigs, status),
and an **Execution Detail** view (`execution-detail.tsx`) with a
three-party signature checklist (`signature-row.tsx`) — Issuer and
Auditor pre-signed with solid black `[ ✓ SIGNED ]` / `[ ✓ VERIFIED ]`
badges, Counterparty ("You") starting as an outlined
`[ AWAITING SIGNATURE ]`. The counterparty's address is the *actual*
connected Freighter address from `useWallet()` when available, falling
back to "Not connected" — deliberately not fabricated the way the
other two parties' addresses are, since faking the current user's own
identity would cross from "mocked infrastructure" into actually
misleading UI. Clicking "Sign & Execute Contract" logs
`[NETWORK] Requesting multi-sig Freighter execution...` to a dedicated
`execution-log.tsx` terminal (visually matching `TerminalConsole`'s
dot-header styling but independent — the two aren't state-compatible
enough to share one component), waits ~1.2s, then logs a completion
line, flips the counterparty's badge to signed, and replaces the
button with a disabled `[ ESCROW LOCKED & ANCHORED ]`. The queue's
Required Sigs/Status columns are derived from the same signed flag
rather than frozen mock text, so going back to the queue after
executing shows `3/3` / `Escrow Locked & Anchored` — the two views
stay consistent since there's only one real source of truth for the
signed state.

Two real layout bugs found and fixed during mobile verification, not
cosmetic nitpicks:
1. A fifth sidebar link made the existing "equal-width columns that
   wrap" mobile nav pattern (from Session 10) actively worse, so the
   mobile nav was redesigned to a horizontally-scrolling row
   (`overflow-x-auto`, `shrink-0`, `whitespace-nowrap` per link)
   instead of patching column-wrapping again — this scales to any
   future link count without revisiting the nav every session. The new
   badge span needed its own `whitespace-nowrap`/`shrink-0` or it
   wrapped to three lines inside the link.
2. The Pending Queue table's header wrapped mid-phrase
   (`DOCUMENT`/`HASH`) on mobile even though its wrapper was scrolling
   correctly (`overflow-x: auto`, confirmed via direct DOM measurement,
   not just a visual guess) — the table's `min-w-[720px]` was a few
   dozen pixels short of its actual unwrapped content width (the long
   "Escrow Locked & Anchored" status string was the culprit). Fixed
   with `whitespace-nowrap` on the table itself so cells can never
   wrap and the table grows to whatever width its content genuinely
   needs, relying purely on the scroll container as the escape hatch —
   more robust than guessing a larger fixed `min-w` value.

Verified for real: typecheck/lint/build clean; Playwright + system
Chrome drove the full flow — queue row content, click-through to
detail, all three initial badge states, clicking execute and observing
the exact terminal log line and the button's disabled locked state,
confirming the queue reflects updated `3/3`/`Escrow Locked & Anchored`
on return, and mobile screenshots re-taken after each of the two nav
fixes above to confirm by eye, not just by assertion, that nothing
clips or overlaps.

**Session 12 — Tokenized Asset Vault (2026-07-15)**
New route `frontend/app/(platform)/dashboard/vault/page.tsx` — placed
under the existing `dashboard/` folder inside the `(platform)` group
specifically so the URL is the literal `/dashboard/vault` the task
asked for, while still inheriting the persistent sidebar. Sidebar
gained a sixth link, "Tokenized Vault" (no badge, unlike Deal Room —
nothing here is "pending").

`components/vault/` holds two static (server-rendered, no client JS)
pieces: `protocol-metrics.tsx`, a stark 3-column grid (divide-x on
desktop, stacks with divide-y on mobile) for the mock protocol-level
numbers (`$142,500,000` total value anchored, `34` active contracts,
`Soroban Testnet`), and `asset-ledger.tsx`, a heavy-bordered table
listing the three mock tokenized assets with head/tail-truncated
56-character contract-ID-shaped token IDs (`truncateMiddle`, same
helper as every other table in the app) and a `[ View Hash ]` link per
row styled as a bordered terminal link. The link is a real Next.js
`Link` to `/verify` (not a dead `<span>` — the task said "in theory
would route," which a genuine same-app navigation satisfies more
honestly than a non-interactive mock). Table uses the same
`min-w-[760px]` + `overflow-x-auto` + `whitespace-nowrap` pattern
`pending-queue.tsx` landed on in Session 11 specifically to avoid that
session's mid-word mobile wrapping bug — applied here from the start
rather than re-discovered.

Page-level header block (`// Tokenized Vault` eyebrow + `Asset Vault`
h1, `border-b px-6 py-10 md:px-10`) intentionally copies Deal Room's
header markup byte-for-byte rather than extracting a shared component,
consistent with this codebase's established pattern of small,
duplicated per-feature header blocks (`verification-ledger.tsx`,
`developers/section-header.tsx`, Deal Room's own page) over a
cross-feature abstraction for a ~6-line block.

Verified for real: typecheck/lint/build clean (`/dashboard/vault`
compiles fully static at 176 B, no client JS needed since nothing on
the page is interactive beyond native `<Link>` navigation); Playwright
+ system Chrome confirmed all three metrics, all three table rows'
exact name/token-ID/TVL text, and — not just that the View Hash button
rendered — that clicking it actually navigates to `/verify` and lands
on the real portal. Desktop and mobile screenshots confirmed the
padding matches Deal Room's and nothing clips at 390px.

**Session 13 — Local ledger persistence (2026-07-16)**
The Dashboard's "Recent Anchors" table is no longer static mock data —
it now reflects the user's real anchoring history, persisted to
`localStorage`. `frontend/lib/useLedgerStore.ts` is a small
module-level store (not a Context/Provider, since `VerificationWorkspace`
and `VerificationLedger` are server-rendered siblings under
`app/(platform)/dashboard/page.tsx` and don't share a client subtree to
wrap): a module-scoped `records` array plus a subscriber `Set`, exposed
as three functions —
- `addRecord({ filename, hash, issuer })` — synthesizes `id`
  (`crypto.randomUUID()`) and `timestamp` (`new Date().toISOString()`),
  prepends to the in-memory array, persists to `localStorage` under
  `axiom.ledger.v1` (try/caught — private-browsing/quota failures
  degrade to in-memory-only for that session rather than throwing),
  and notifies subscribers.
- `getRecords()` — plain synchronous read, for non-React call sites.
- `useLedgerStore()` — wraps the above in `useSyncExternalStore` (React
  18) so any component calling it re-renders the instant `addRecord`
  fires elsewhere in the tree, with a stable empty-array
  `getServerSnapshot` to avoid an SSR/hydration mismatch.

`VerificationWorkspace`'s anchor success path now calls `addRecord`
directly after `[SOROBAN] Anchor confirmed. Ledger state updated.` is
logged — real filename, real SHA-256 hash, real connected wallet
address, all already in hand at that point, no new plumbing needed to
get them there. `VerificationLedger` is now `"use client"` (required,
since `useSyncExternalStore` is a client-only hook) and renders
`useLedgerStore()`'s records through the existing `LedgerRow` /
`truncateMiddle` — unchanged — with a new `formatTimestamp` helper in
`lib/format.ts` matching the old mock data's `"YYYY-MM-DD HH:MM UTC"`
shape. Empty state renders the exact literal string the task
specified: `[ NO LOCAL RECORDS FOUND. AWAITING INPUT. ]`, as a single
full-width row rather than an empty table.

Verified for real, including the one piece that's usually the weak
link with `localStorage` state — cross-component reactivity without a
reload: temporarily wired a hidden debug button into
`VerificationWorkspace` that called the *real* `addRecord` (same
import, same module instance) with fixed test data, confirmed via
Playwright that the already-mounted `VerificationLedger` updated
instantly with no reload, that `localStorage`'s JSON shape exactly
matches `AnchorRecord`, that a second add stays newest-first with
unique ids, and that both rows survive a real page reload — then
reverted the debug button before finishing (confirmed via `git diff`
that only the real one-line `addRecord` call in the success path
remains). The Freighter-signing step itself still isn't drivable on
this machine (same standing limitation as every session since 5), so
the debug button substituted only for *that* — everything downstream
of a successful anchor (the actual subject of this session) was
exercised for real.

(Note: the user's brief for this session was labeled "Session 10," but
per this file's own numbering it's the 13th — logged here as Session
13 to keep this document's sequence internally consistent.)

**Session 14 — Wiring the Deal Room, Asset Vault, and Verify Portal to
real ledger state (2026-07-16)**
The three routes that were still on hardcoded mock data (Deal Room,
Asset Vault, and the `/verify` portal's input) now all read/write
through `useLedgerStore`, closing the loop end-to-end: anchor a
document on `/dashboard` → it appears in the Deal Room queue and the
Asset Vault → clicking either's `[ View Hash ]` lands on `/verify`
with the hash already filled in.

`deal-room-workspace.tsx` derives its `Deal[]` from
`useLedgerStore()` records instead of one hardcoded `MOCK_DEAL` — per
this session's explicit simplification option, every anchored record
is treated as a deal awaiting multi-sig execution (issuer = the
record's real address; auditor stays a fixed mock, since there's no
real auditor concept yet). The "signed" state from the mock
Sign & Execute flow (Session 11) is now a `Set<string>` of deal ids
instead of a single boolean, so multiple deals can be independently
executed; it's intentionally still local component state, not
persisted — the multi-sig interaction itself remains a UI simulation,
only the underlying documents are real now. Selecting a different
queue row resets the execution log so a previous deal's lines don't
bleed into the next. `pending-queue.tsx` gained an empty-state row
(`[ NO PENDING DEALS. ANCHOR A DOCUMENT TO BEGIN. ]`) since an empty
real ledger is now a reachable state, not just a hypothetical.

`asset-ledger.tsx` similarly maps real records instead of the three
hardcoded assets: `Asset Name` is the record's actual filename (the
only real "name" data available), and `Token ID` (`TKN-XXXXXXXX`) and
`TVL` are *deterministically* derived from the real hash (`hash.slice
(0, 8)`, hex-parsed and mapped into a dollar range) — same hash always
produces the same token ID/TVL, so the "unique financial asset"
illusion survives reloads instead of re-randomizing every render. Same
empty-state treatment as the Deal Room. Section A's protocol-level
metrics (Total Value Anchored, Active Contracts, Network) were left
as-is per the task's scope — only the Asset Ledger table was in scope
for this wiring pass.

Both `[ View Hash ]` links (Vault) and a new one added next to the
Deal Room's Execution Detail heading now use Next's typed `Link`
`href={{ pathname: "/verify", query: { hash } }}` rather than a plain
string, landing on `/verify?hash=<realhash>`. `app/(platform)/verify
/page.tsx` reads `searchParams.hash` (this makes the route dynamic —
confirmed in the build output, `ƒ /verify` instead of `○`, expected
and correct for a page that now depends on the query string) and
passes it to `VerifyPanel` as `initialHash`, which seeds the input via
`useState(() => initialHash?.trim().toLowerCase() ?? "")`. Deliberately
pre-fills only, doesn't auto-submit the query — the task asked
specifically to save the user from copy-pasting, not to remove the
explicit "Query Ledger State" click.

The sidebar's Deal Room badge, hardcoded to `[ 1 PENDING ]` since
Session 11, was also wired to `useLedgerStore()` (`records.length`,
hidden entirely at zero) — not explicitly requested by name, but
leaving a fake, static "1 pending" badge sitting right next to
freshly-real data would have directly contradicted this session's own
goal of flawless data flow, and the fix was a few lines once
`sidebar-nav.tsx` already needed the hook. The badge intentionally
counts *all* anchored records, not just unexecuted deals — the
executed/`signedIds` state lives only inside `DealRoomWorkspace`'s
local state, not in any shared store the sidebar can see, and lifting
it into one would be new persistent-state machinery for what's still
an explicitly mocked interaction layer.

Verified for real, in the same style as Session 13 (temporarily wiring
the real `addRecord` behind a hidden debug trigger, since Freighter
still isn't installed on this machine): confirmed the empty state on
all three surfaces (and no sidebar badge) with a cleared ledger; seeded
two real records and confirmed the sidebar badge read `[ 2 PENDING ]`;
confirmed the Deal Room queue showed both with `Action Required`
status, that opening one showed the real issuer address, and that its
`[ View Hash ]` landed on `/verify` with a real 64-char hash pre-filled;
confirmed the Vault showed both real filenames with correctly-formatted
derived Token IDs/TVL, and that its `[ View Hash ]` pre-filled the
*exact* same hash string as the source record (strict equality, not
just "non-empty"); confirmed executing a deal still flips its status
correctly and that the sidebar badge stays at 2 afterward (by design —
see above); reverted the debug trigger and confirmed via `git diff`
that `verification-workspace.tsx` has zero changes this session. One
real bug caught and fixed *in the test script itself*, not the app: an
early pass asserted table row counts immediately after `page.goto`
without waiting for client hydration to replace the SSR empty-state
render, which briefly races on `useSyncExternalStore`'s server
snapshot — fixed by waiting for real content before counting, then
re-ran to confirm all counts were correct all along.

**Session 15 — Cryptographic Audit Trail (2026-07-16)**
(Note: the user's brief called this "Session 12"; per this file's own
sequence it's the 15th, logged as such for consistency, same as the
Session 13 numbering note above.)

A verified hash on `/verify` now renders a four-node vertical
"Cryptographic Audit Trail" below the existing issuer/timestamp block,
inside the same black `VERIFIED` panel — a new
`components/verify/audit-trail.tsx`, a `<ol>` with a solid white left
border and small square markers (`border border-white bg-black`,
positioned to sit exactly on the border line) styled to match the
dark terminal aesthetic already established by `TerminalConsole` /
`ExecutionLog` elsewhere in the app. All four nodes' copy is exactly
what the task specified (Origination/Protocol Escrow/Deal Room/Asset
Vault, including the real deployed contract ID in node 2's subtext)
and their timestamps are computed as fixed offsets from the verified
record's real anchor timestamp — `-2min`, `+0`, `+5min`, `+6min` — via
a new `formatTimestampWithSeconds` in `lib/format.ts` (the existing
`formatTimestamp` only went to minute precision; this task specifically
asked for `HH:MM:SS`, so a second formatter was added rather than
changing the first and affecting every other table that already uses
it).

The task described the audit trail appearing "when a hash is
successfully found (either via local state lookup or Soroban RPC)" —
until now `/verify` only ever queried real Testnet RPC. `verify-panel
.tsx` now falls back to `getRecords()` (from `useLedgerStore`) when the
RPC lookup returns no match *or* throws, mapping the matching
`AnchorRecord` into the same `ComplianceRecord` shape the RPC path
already produced. This isn't just a testability convenience (though it
is one, given Freighter still isn't installed here) — for records this
browser anchored itself, showing "verified" from local knowledge even
if the RPC round-trip is briefly slow or flaky is a genuine UX
improvement, not a compromise.

Verified for real, with unusually tight precision: seeded one real
record via the same temporary-debug-trigger technique as Sessions 13
(the trigger was added, exercised, then fully reverted — confirmed via
`git diff` showing zero changes to `verification-workspace.tsx`), then
had the test script independently compute all four expected
`YYYY-MM-DD HH:MM:SS UTC` strings from that exact record's timestamp
and assert each one appears verbatim in the rendered DOM — not "a
timestamp is present" but "this exact string, for this exact offset."
All four matched exactly. Also confirmed: the query-param auto-fill
from Session 14 still seeds the input correctly, this hash resolves
via the new local-state fallback (it was never really submitted to
Testnet), the rejected state is unaffected and correctly shows no
audit trail section, and zero console errors throughout.

**Session 16 — Zero Mocks: a real headless anchoring API (2026-07-16)**
`POST /api/v1/anchor` (`frontend/app/api/v1/anchor/route.ts`) is a
genuinely functional Next.js Route Handler — the Developer Portal's
`request.sh`/`response.json` mock (Session 10) now has a real backend
behind the exact same shape, no mocking anywhere in the request path.
`export const runtime = "nodejs"` is explicit, not assumed — this
route touches `SERVER_SECRET_KEY` and `stellar-sdk`'s Node-only
crypto/Buffer usage, neither of which belong anywhere near the Edge
runtime.

Request handling, in order: `Authorization` header must start with
`Bearer ax_live_` (401 otherwise, per the task's literal "accept any
token with this prefix" spec — this is not real per-key auth, just a
format gate, and is documented as such below); body must parse as
JSON (400); `hash` must be 64 lowercase-or-mixed hex chars (400);
`issuer` must pass `StrKey.isValidEd25519PublicKey` (400) rather than
a hand-rolled regex, since the SDK's own validator is authoritative
for what a real Stellar address looks like.

The interesting design decision was reconciling the task's request
body (`hash` + an arbitrary client-supplied `issuer`) with how Soroban
auth actually works: `anchor_proof`'s `issuer.require_auth()` can only
be satisfied by a signature from *that* address's own key. The server
holds exactly one key (`SERVER_SECRET_KEY`) and was never going to
hold arbitrary third parties' keys, so `buildAnchorProofTransaction`
in `lib/soroban.ts` was generalized to take an optional `issuerAddress`
distinct from the signing `sourceAddress` (defaults to `sourceAddress`,
so the existing client/Freighter call site is untouched) — the route
signs with the server key as the transaction source, and passes the
request's `issuer` straight through as the on-chain argument, exactly
as the task specified. In practice this means the happy path requires
`issuer` to equal the server's own public key; anything else traps,
which Task 4 explicitly asked to handle gracefully anyway — verified
both paths for real (below), not just the matching case. The contract
itself has no admin/owner gating at all (re-read `contracts/src/lib.rs`
to confirm before designing around it, not assumed) — "the admin
account we used to deploy the contract" from Task 1 is a narrative
framing, not an on-chain requirement, so any funded Testnet keypair
works as `SERVER_SECRET_KEY`. The one already sitting in this
machine's `.env.local` was verified funded and reused rather than
replaced. A new committed `frontend/.env.example` documents both env
vars (`.env.local` itself stays gitignored, so this is the actual
"update the setup instructions" deliverable — a raw secret can't be
committed).

Errors are split by *where* they actually occurred, not lumped into
one catch-all: simulation-stage failures (bad input, the write-once
"hash already anchored" panic) return 400; submission/confirmation
failures return 500. Confirmed on real traffic that this split isn't
just tidy code — it's necessary, because Soroban's `require_auth`
mismatch (mismatched `issuer`) does *not* always get caught by
simulation the way a contract panic does; it can pass simulation and
only fail when the ledger actually enforces auth at submission,
surfacing as a 500 rather than a 400. This is a real, useful thing to
know about this SDK/network combination, not a design flaw in the
route — the failure is still caught cleanly either way.

Verified for real, end-to-end, against live Testnet, with zero
Freighter dependency (unlike nearly every other flow in this app, this
one needed no browser wallet at all, so nothing here is "verified as
thoroughly as this environment allows" — it's just verified):
confirmed 401 on a missing/malformed `Authorization` header, 400 on a
malformed hash, a malformed issuer address, and unparseable JSON;
submitted a real anchor with a freshly-generated hash and the server's
own address as issuer and got back a genuine `200` matching the exact
mocked schema — then independently re-verified the write landed by
calling `verify_proof` read-only from a separate throwaway script (not
trusting the route's own success report), which returned the real
issuer and timestamp; re-submitted the identical hash and confirmed
the write-once panic traps cleanly as a 400 with the real Soroban
diagnostic event log in the message; submitted with a mismatched
`issuer` and confirmed it fails as a 500 at submission (see above);
and replayed the Developer Portal's exact documented cURL body,
including its extra `"network"` field (which the route correctly
ignores, since only `hash`/`issuer` are contractually required), and
got a real confirmed anchor back.

**Session 17 — Stateful Asset Vault metrics (2026-07-16)**
Section A's protocol-level metrics on `/dashboard/vault`, explicitly
left hardcoded in Session 14's scope note above, are now wired to
`useLedgerStore` too — the Vault has zero remaining mock data.
`calculateAssetValue(hash)` moved into `lib/format.ts` (alongside a new
`formatUsd` helper) rather than living in the page file, since both
`protocol-metrics.tsx` and `asset-ledger.tsx` need the exact same
per-hash dollar figure and a shared source keeps them from silently
drifting apart. It supersedes `asset-ledger.tsx`'s old
Session-14-local `deriveMockTvl` (deleted, same hex-parse-into-a-range
approach, now just centralized and widened from a $50k–$10M spread to
the task's specified $1M–$25M).

`protocol-metrics.tsx` is now a client component (`useLedgerStore()`)
instead of a static array: **Active Contracts** is `records.length`
directly; **Total Value Anchored** sums `calculateAssetValue` across
every record and formats via `formatUsd`, correctly showing `$0` at
zero records rather than the old hardcoded `$142,500,000`. **Network**
stays a static `"Soroban Testnet"` label — there's no per-record
network data to derive it from. The Asset Ledger table's existing TVL
column (added in Session 14) now calls the shared `calculateAssetValue`
instead of its own local copy; the Token ID column is untouched (no
real per-asset token ID data exists yet, so it stays a hash-derived
`TKN-XXXXXXXX` label, out of this session's scope).

Verified for real in a real browser (Chrome via Playwright), seeding
`useLedgerStore`'s real `axiom.ledger.v1` localStorage key directly
rather than going through the debug-trigger pattern, since this
session only touches read-side derivation, not `addRecord` itself:
confirmed the empty-ledger state shows `$0` / `0` / the existing
placeholder row; seeded two records with known hashes and confirmed
both per-row TVLs and the summed Total Value Anchored metric matched a
hand-computed `calculateAssetValue` reference implementation exactly
(`$22,944,293` + `$1,065,297` = `$24,009,590`, both the table and the
metrics panel agreed to the dollar); confirmed Active Contracts read
`2`; cleared the seeded state afterward so it wouldn't linger in this
machine's real local dev data. `tsc --noEmit` clean.

**Session 18 — Live QR code on the Compliance Receipt (2026-07-17)**
The PDF compliance receipt (`lib/pdf.ts`, downloaded from the Dashboard
after a confirmed anchor) now embeds a real, scannable QR code instead
of being pure text — `qrcode` + `@types/qrcode` installed as real
dependencies (not devDependencies; the generated code ships inside a
user-facing download, so it's runtime, not tooling). The QR payload is
the contract's actual Stellar Expert Testnet explorer URL
(`https://stellar.expert/explorer/testnet/contract/<contractId>`, built
from `data.contractId` so it stays correct if the deployed contract
ever changes) — not the document hash or issuer address, since the
task asked specifically for a link to the on-chain explorer, not a
self-referential payload.

`QRCode.toDataURL` is async, which made `downloadComplianceReceipt`
itself async (`Promise<void>`, was `void`) — its one call site in
`verification-workspace.tsx`'s `handleDownloadReceipt` now does `void
downloadComplianceReceipt(...)`, explicit fire-and-forget since it's
invoked from a synchronous `onClick`. The new `drawExplorerQrCode`
helper draws a 32mm QR image inset 2mm inside a heavy 0.8mm black
`rect(..., "S")` border, both flush against the page's bottom-right
corner (computed from `boxRight`/`boxBottom`, not hardcoded offsets,
so the box and image can't drift apart if either constant changes) —
matches the receipt's existing "heavy border, no gradients" language
used everywhere else on the page. The `[ SCAN TO VERIFY STATE ON
STELLAR EXPERT ]` caption is bold Courier at 6.5pt, right-aligned to
sit directly *above* the box rather than squeezed beside it — an
initial beside-the-box layout (right-aligned text ending a few mm to
the box's left) visually overlapped the QR's left edge when actually
rendered, so it was moved above instead, which reads just as
"next to it" while leaving no ambiguous horizontal-fit math.

Verified for real, not just by code review: a standalone Node script
(outside the Next.js/React tree, run directly against
`frontend/node_modules`'s installed `jspdf`/`qrcode`, deleted after)
called the exact same `QRCode.toDataURL`/`jsPDF.addImage`/`rect`
sequence as `pdf.ts` against the real deployed contract ID, confirmed
the generated data URL is a real `image/png` payload, wrote the
resulting PDF to disk, confirmed it opens as a valid PDF (`%PDF-`
header, contains a real `/Image` XObject, not an empty placeholder),
and visually inspected the rendered page directly — caught the
beside-the-box overlap this way on the first pass, fixed the layout,
then re-rendered and visually confirmed the fix (border, caption, and
QR code all sit cleanly in the bottom-right corner with no overlap).
`npx tsc --noEmit` and a full `next build` both pass with zero errors.

**Session 19 — Deterministic mock signers close out Zero Mocks
(2026-07-17)**
The last hardcoded wallet address in the app is gone. A new
`frontend/lib/keys.ts` exports `generateMockStellarKey(hash, role)`: it
hashes `${hash}:${role}` with a small FNV-1a mix into a 32-bit seed,
feeds that into a `mulberry32` PRNG, and draws 55 characters from the
same 32-symbol alphabet real Stellar keys use (`A-Z2-7`), prefixed with
`G` — a 56-character string that looks exactly like a real public key
(confirmed against `/^G[A-Z2-7]{55}$/`) without claiming to be a valid
StrKey-checksummed one (it isn't, and doesn't need to be — "Mock" is in
the name). Same hash + same role always produces the same string;
different roles on the same hash, or the same role on a different
hash, both produce different strings — this is the whole point, since
it's what lets Party 2/3 have stable "identities" without a database.

`deal-room-workspace.tsx` lost its `MOCK_AUDITOR` constant entirely.
Every deal's `auditor` and new `counterparty` fields are now
`generateMockStellarKey(record.hash, "auditor" | "counterparty")`.
This also meant reconsidering what "Party 3" actually represents: it
used to display the *actually connected* Freighter/raw-keypair wallet
address (labeled "Counterparty / You"), which was itself a mild
hardcoding smell — the same real address one connects with was being
reused to play a pretend second signer. Per this session's explicit
task spec, Party 1 (Issuer) is the only party that stays tied to a
real address (`record.issuer`, the actual signer from the original
anchor); Party 2 and 3 are now both deterministic mocks, and the
`useWallet`/`address` plumbing that only existed to feed the old
Party 3 display was removed from `deal-room-workspace.tsx` and
`execution-detail.tsx` entirely — nothing else in the Deal Room needed
it. The "Counterparty / You" role label is now just "Counterparty",
since it no longer literally is the person clicking the button.
`execution-detail.tsx`'s signing state/`onExecute` flow is untouched;
only the *displayed* address for that row changed.

`signature-row.tsx` now renders two versions of each address —
`truncateMiddle(address, 6, 4)` (e.g. `GC5VAG…NLBQ`) shown only below
the `sm` breakpoint, and the full 56-character address (`break-all`,
as before) shown at `sm` and up — rather than a single always-wrapping
string, so a 56-character monospace address doesn't dominate a phone
screen while desktop still gets the complete, copyable value.

Verified for real in a real browser (Chrome via Playwright), at both a
1280px desktop viewport and a 375px mobile viewport, seeding
`useLedgerStore`'s real `axiom.ledger.v1` localStorage key directly (no
debug trigger needed — this session only touches read-side display):
confirmed Party 1 showed the seeded record's real issuer address;
confirmed Party 2 and Party 3 exactly matched a hand-computed reference
implementation of `generateMockStellarKey` run standalone in Node
against the same hash/role inputs (down to the exact 56-character
string); confirmed re-selecting the same deal after navigating back to
the queue produced the identical Party 2/3 addresses (determinism
holds across remounts, not just within one render); confirmed the
mobile viewport showed the 11-character truncated form
(`GC5VAG…NLBQ`) for all three rows with zero horizontal page overflow,
while the desktop viewport showed full untruncated addresses. `tsc
--noEmit` and a full `next build` both pass with zero errors — the
`/deal-room` route's First Load JS also dropped (6.25 kB → 3.35 kB)
now that it no longer pulls in the wallet context.

**The 'Zero Mocks' phase is now complete.** Every number, address, and
record rendered anywhere in the app is either read from real Soroban
Testnet state, derived from a real user-anchored record in
`useLedgerStore`, or — where no real counterparty/valuation data can
exist yet (mock auditor/counterparty signers, per-asset TVL, token
IDs) — deterministically computed from that record's real hash rather
than hardcoded or randomized. The remaining simulated pieces (the
multi-sig "signing" interaction itself, per-asset TVL/token ID as a
financial concept) are explicitly still UI simulations of workflows
Axiom doesn't have real backing systems for, not stray mock data left
over from earlier sessions.

**Session 20 — Web3 Wallet Intercept modal (2026-07-17)**
Clicking "Anchor to Soroban" without a connected wallet used to just be
impossible — the button was `disabled` outright whenever `!address`,
with a small "connect wallet to anchor" hint as the only feedback. That
UX is replaced with an intercept: the button is now only disabled on
`status !== "done" || isAnchoring`, and `handleAnchorClick` in
`verification-workspace.tsx` checks `address` itself first — if
missing, it calls `setIsWalletModalOpen(true)` and returns before
touching the Soroban pipeline at all; if present, the existing
simulate/sign/submit/confirm flow runs exactly as before, untouched.

New `frontend/components/WalletModal.tsx`: a fixed, centered overlay
(`bg-black/80`) holding a `border-2 border-black` white panel — header
reads "AUTHORIZATION REQUIRED // CONNECT WALLET" with a
`[ X ] CLOSE` control at the top right, then three bracket-icon rows
(`[ F ]`/`[ A ]`/`[ X ]`) for Freighter, Albedo, and xBull. Freighter
is the only one that's real: it reuses the existing `useWallet()`
context's `connect()` (same Freighter pipeline `wallet-context.tsx`
already had, so this modal is a new entry point into existing
machinery, not a parallel implementation), and a successful connection
closes the modal automatically via an effect watching `state ===
"connected"`. Albedo and xBull have no real integration in this
codebase, so per this project's running "don't fake functionality"
principle (see the Zero Mocks phase above), their rows are visually
present with the requested subtext but carry a plain, unclickable
`COMING SOON` tag rather than a button that would pretend to connect
to a wallet that isn't wired up.

Freighter's row calls `isConnected()` from `@stellar/freighter-api`
directly (a separate call from the one already inside
`connectFreighterWallet()`) purely for *display* — detect extension
presence before the user commits to clicking Connect. This surfaced a
real, worth-documenting SDK behavior: with no extension present to
answer it, `isConnected()` neither resolves nor rejects — it just
hangs forever, confirmed by watching the row sit on "Detecting..."
indefinitely in a real browser. Left as-is, every visitor without
Freighter installed (i.e. most first-time visitors, the exact
audience this modal exists for) would see a permanently stuck
"Detecting..." row. Fixed with `Promise.race` against a 2.5s timeout
that resolves to `"not-installed"` if `isConnected()` hasn't answered
by then — not part of the original task spec, but a direct
consequence of testing the literal spec'd behavior for real instead of
trusting it in code review.

Verified for real in a real browser (Chrome via Playwright): dropped a
real file to reach "Hash Ready" with no wallet connected, confirmed
the modal was absent beforehand, clicked "Anchor to Soroban" and
confirmed the modal opened instead of any network activity starting;
confirmed all three wallet rows, their exact subtext strings, and the
close control render; confirmed the Freighter row read "Detecting..."
immediately after opening and "Extension not found" + an "Install"
button after the 2.5s fallback elapsed (this machine still has no
Freighter extension in the automated browser, consistent with every
prior session); confirmed clicking `[ X ] CLOSE` removed the modal
from the DOM. `tsc --noEmit` and a full `next build` both pass with
zero errors.

**Session 21 — Wallet Modal follow-up fixes (2026-07-17)**
Two rounds of real-usage feedback on Session 20's Wallet Modal and the
surrounding UI, all fixed and re-verified in a real browser:

*Sidebar active-item collapse.* The Deal Room sidebar link wrapped its
label onto two lines ("DEAL" / "ROOM") whenever it was both active
*and* showing a pending-count badge. Measured it directly in the DOM
rather than guessing: the label's unwrapped width (80.4375px) was
sitting right at the edge of the space left after the badge and arrow
(80.44px available) — a razor-thin fit that different sub-pixel
rounding could tip either way, which is exactly why it looked fine in
one screenshot and broken in another. The arrow is purely decorative
(the active row already inverts to black), so it's now hidden whenever
a badge is present (`isActive && !badge`), which removes ~27px of
demand and stays robust regardless of how many digits the pending
count grows to — not just a fix for the "3 pending" case that was
actually reported.

*Verification log growing indefinitely.* `TerminalConsole` used
`min-h-[420px]`, a floor with no ceiling, so it grew taller with every
appended line instead of behaving like a real terminal. Changed to a
fixed `h-[420px]` with `overflow-y-auto` on the inner line list, plus
an effect that scrolls to the bottom on every new line. Verified by
temporarily wiring a hidden debug button that flooded 30 lines in
(reverted after, confirmed via `grep` that no trace of it remains) —
the panel height stayed exactly 420px throughout, the inner scroll
area grew to a real 1052px `scrollHeight` against a 379px
`clientHeight`, and it stayed auto-scrolled to the newest line.

*Anchor doesn't auto-resume after connecting.* Clicking "Anchor" while
disconnected now sets a `pendingAnchor` flag alongside opening the
modal. A new effect watches `[pendingAnchor, address, file]` and fires
the same `runAnchor` the button itself calls the moment `address`
becomes non-null — so a successful connect resumes the exact anchor
the user asked for with no second click. Guarded two edge cases: the
modal's `onClose` only clears `pendingAnchor` if the user dismissed it
*without* connecting (not when it auto-closes because a connection
just succeeded — checked via `address` still being null at close
time), and dropping a *different* file while the modal is open clears
`pendingAnchor` too, so a stale intent can't auto-anchor a document the
user never actually clicked "Anchor" for. `runAnchor` itself was
extracted out of the click handler into a `useCallback` so both the
click path and the resume-effect path call the identical pipeline.
Verified end-to-end with the same temporary `window.__debugConnect`
hook used in Session 20 (reverted after, `git diff` on
`wallet-context.tsx` came back empty): confirmed the modal opened with
zero pipeline lines added, then confirmed simulating a connection both
auto-closed the modal *and* appended a fresh "[NETWORK] Simulating
transaction payload..." line with no additional click.

*Wallet Modal icon boxes.* An external edit between sessions had
dropped the icon span's `w-9`, so `[ F ]` collapsed into two lines
inside a now-non-square border box — fixed by restoring the square
box initially, then a follow-up request asked to drop the border
entirely and keep bracket-only text at the original `h-9` (not the
`h-10` this session had briefly bumped it to). Also added a click-
outside-to-close backdrop, a linear "snap" mount transition (matching
`SnapIn`'s no-soft-easing philosophy, used here directly via
`framer-motion` since this is a mount transition, not a scroll
reveal), and a muted/non-interactive treatment for the Albedo/xBull
rows so "not wired up yet" reads as visually distinct from
"Freighter, which actually works."

*Freighter detection duplication.* The modal's own timeout-raced
`isConnected()` check was pulled out into a shared
`isFreighterInstalled()` in `lib/wallet.ts`, so the exact same
hang-proofing (a real SDK behavior documented in Session 20 — no
extension means the promise never settles) isn't maintained in two
places. `connectFreighterWallet()` was also switched to call this
shared helper instead of raw `isConnected()`, closing the same latent
"Connecting..." forever risk in the sidebar's own Connect button that
Session 20 only fixed inside the modal.

*Corner registration marks scrolled away.* `Frame`'s four `+` marks
were `position: absolute` inside the normal-flow, scrolling frame
container, so they scrolled off screen instead of staying put like a
print crop mark. Switched to `position: fixed`, with the horizontal
offset written as `max(0.25rem,calc((100vw-1440px)/2+0.25rem))` so
they still land exactly on the frame's actual border corner (not the
raw viewport edge) on screens wider than the `max-w-[1440px]` frame.
Verified the top-left mark's `getBoundingClientRect().top` was
identical (4px) before and after an 800px scroll, and that its left
offset landed exactly 4px inside the frame's real border edge.

*Can't drop a second document without a refresh.* `Dropzone` treated
any non-`"idle"` status as busy, which included `"done"` — meaning a
finished (or even successfully anchored) upload permanently blocked
the next one. Narrowed to `status === "processing" || isAnchoring`
(the hashing animation and an in-flight transaction are the only
states where swapping `file` out from under the pipeline would be
unsafe), added a "Drop another document to replace this one" hint, and
made `handleFileDropped` clear `pendingAnchor` so a new drop can't
inherit a stale wallet-modal intent from the previous file. Verified
by dropping two different real files back-to-back in the same page
load with no reload in between.

*Wallet connection persistence and disconnect.* Freighter remembers
per-site authorization on its own, so a page reload silently checking
for that (via a new `checkExistingConnection()` — deliberately never
calls `setAllowed()`, the interactive consent step, so a reload can't
surface a permission popup out of nowhere) restores `connected` state
without forcing a re-click. Guarded with the same timeout-raced
`isFreighterInstalled()` so a machine with no extension at all still
resolves to `disconnected` promptly instead of hanging the check
forever — verified by reloading fresh and confirming "Connect Wallet"
appears within the wait window, not stuck mid-check. A new
`disconnect()` clears local state only; it does not and cannot revoke
Freighter's own site permission (that's only done from inside the
extension), so a later "Connect" click reconnects without a fresh
prompt — this is standard dapp behavior, not a shortcut. Wired into
the sidebar's `WalletConnector` as a small "Disconnect" link under the
connected-address box. Verified via the same debug-hook pattern:
confirmed the Disconnect link appears once connected, and that
clicking it clears the address and reverts the sidebar to "Connect
Wallet".

`tsc --noEmit` and a full `next build` pass with zero errors after all
of the above.

**Session 22 — Purge the "Generative AI template" aesthetic
(2026-07-17)**
A global CSS and structural sweep across the entire frontend, executed
against four explicit constraints rather than a task-by-task feature
brief. Touched roughly 40 files.

*Typography.* `<body>` (`app/layout.tsx`) now sets `font-mono` instead
of `font-sans` as the default — IBM Plex Mono was already wired to the
`--font-mono` CSS variable and Tailwind's `mono` token since Session 3,
it just wasn't the *default*; Archivo (`font-sans`) is still imported
and available but no longer the fallback for un-annotated text. The
one stray explicit `font-sans` override (`/verify`'s h1) was removed
so it inherits the new default like every other page heading already
did. `rounded-none` was already structurally guaranteed by
`tailwind.config.ts`'s zeroed `borderRadius` scale (a grep for
`rounded-(sm|md|lg|xl|2xl|3xl|full)` across the whole app returned
zero hits — nothing to remove), but per the explicit task spec it's
now also *stated* on the components a reader would think of as chrome
— `Button`, `WalletModal`'s panel, both hash/API-key `<input>`s, and
the verify-result/credential-box "card" panels — rather than resting
entirely on the invisible config override.

*Hacker-terminal decoration.* Removed every decorative `//`-prefixed
UI label (`// Tokenized Vault`, `// Deal Room`, `// Ledger`, the
reusable `SectionHeader`'s `` `// ${label}` ``, `AuditTrail`'s
`// Cryptographic Audit Trail`, all four landing-page `// 0N` section
eyebrows) and every `> `-prefixed terminal log line
(`TerminalConsole`, `ExecutionLog`). Two different replacements,
depending on shape: a simple label-above-heading eyebrow (most page
headers) became a bordered inline tag — `<p className="inline-block
border border-black px-2 py-1 ...">Label</p>` — while the four
landing-page numbered sections (`01`–`04`, which are a literal
numbered sequence, not just a label) got the task's literal example
structure: a bordered flex row with the number as a filled badge
flush against the heading (`<div className="flex border-b-2
border-black"><span className="bg-black text-white ...">01</span>
<h2>...</h2></div>`), color-inverted on `TerminalCta`'s black-background
section. Terminal log empty-states became `[ AWAITING INPUT ]` /
`[ AWAITING EXECUTION ]`, matching the bracket convention already used
by every other empty-state in the app, rather than a slash comment.
`WalletModal`'s `"AUTHORIZATION REQUIRED // CONNECT WALLET"` header
became an em dash, since it's a compact single-line header, not a
section eyebrow — the block-badge treatment didn't fit that shape.
Deliberately left alone: the `//` inside `api-docs.tsx`'s
`REQUEST_EXAMPLE`/`RESPONSE_EXAMPLE` strings and `terminal-cta.tsx`'s
code snippet — those are literal `curl`/JS comment syntax inside
illustrative code content a developer would copy, not decorative UI
chrome, and stripping them would make the example look like invalid
code. Also left alone: the single `/` divider in the hero's eyebrow
(`Compliance Infrastructure / Stellar Soroban Network`) and the
sidebar's `→`/`↗` Unicode arrows — the task named `//`, `///`, and a
bare `>` specifically; a single slash and non-ASCII arrow glyphs are a
different, non-hacker-trope convention already established elsewhere
in this design system.

*Absolute monochrome.* Every `text-slate-{300,400,500,600}`,
`bg-slate-*`, and `border-slate-*` in the app — confirmed zero
`gray-*`/`zinc-*` usage existed to begin with — is gone (~85
occurrences across ~35 files). The conversion rule depended on
context, not a blind find-replace: label-style text that was already
`text-xs uppercase tracking-widest` (the large majority) just lost the
color class outright, inheriting black; body-prose paragraphs (hero
tagline, footer description, landing card descriptions) lost the
color but kept their existing size rather than being forced into
all-caps label styling, since forcing a full sentence into
`uppercase` would hurt readability for no stated benefit — the task's
"e.g. text-xs uppercase" was read as an illustrative technique for
labels, not a mandate to shrink every sentence in the app; and
anything living inside a `bg-black` panel (`AuditTrail`, the verify
"found" panel, `TerminalConsole`, `ExecutionLog`, `api-docs.tsx`'s
`CodeBlock`, `TerminalWindow`) had its dimmed `slate` swapped for
plain `text-white` instead of `text-black`, since black-on-black is
invisible — same "no gray" principle, mirrored for a dark background.
One intentional, narrow exception: the hash input's
`placeholder:text-black/40` uses an alpha-blended black rather than a
gray Tailwind token, since an opaque-black placeholder would be
visually indistinguishable from real typed input — this doesn't
violate the letter of the rule (no `gray`/`slate`/`zinc` class used)
and is the only place a translucency technique was judged necessary
for basic usability.

*Logo.* Replaced the plain-text "AXIOM" / "AXIOM PROTOCOL" wordmark in
all three places it appears (`AppSidebar`, `Navbar`, `Footer`) with
the stark two-tone stamped block from the task spec — a
`border-2 border-black` box with a filled black "AXIOM" chip flush
against a white-bg "PROTOCOL" chip. Sized down (`px-2`/`text-[10px]`
vs. the landing page's `px-3`/`text-sm`) specifically in the
platform sidebar, since that context is a fixed 256px-wide column
sharing its header row with a "Console" label — confirmed by direct
DOM measurement (not guesswork, after Session 21's sidebar-collapse
bug taught the lesson that "looks fine at a glance" isn't proof) that
the full-size version plus "Console" would have been too wide for
that row, then verified the actual rendered logo fits on one line at
that width via a real screenshot.

Also updated `.clauderules` itself — the design-system section
previously said "Monochromatic (black, white, slate)"; slate is no
longer sanctioned, and the corner-mark/no-hacker-trope/logo rules
above are now written into the rules file directly so a future session
doesn't reintroduce any of this by default.

Verified for real, not just by code review: `grep` swept the entire
frontend for `slate-\d+|gray-\d+|zinc-\d+` and for the decorative
`//`/`>` JSX-string patterns after every edit — both returned zero
matches at the end. `tsc --noEmit` and a full `next build` both pass
with zero errors. Took full-page screenshots in a real browser (Chrome
via Playwright) of the landing page, dashboard, vault, deal room
(queue and detail view, with real seeded signature rows), developer
portal, the verify portal's "found" state (dark panel + full Audit
Trail), and the Wallet Modal (bracket-only icons, no border box,
"Coming Soon" tags) — confirmed every one is monochrome, square-
cornered, slash-free, and that the new stamped logo fits cleanly at
every width tested, including the constrained sidebar. One real
pre-existing quirk noticed and *not* fixed (out of scope for this
sweep): the landing page's `SnapIn` `whileInView` reveal animation
means a full-page screenshot taken without actually scrolling shows a
blank gap where below-the-fold content hasn't triggered its reveal
yet — confirmed via DOM text search that the content is genuinely
present, and via a scroll-through screenshot that it renders correctly
once revealed. Not a regression from this session, not a hacker-trope
or color issue, so left alone.

**Session 23 — URL-driven verification linkage (2026-07-17)**
Deep-linking into the Verify portal: reviewers can now jump straight
from any hash in the app to a pre-populated, pre-queried audit view
with one click.

- `frontend/components/verify/verify-panel.tsx` — reads the `hash`
  query param via `useSearchParams` (from `next/navigation`) instead
  of a server-passed prop. The submit logic was extracted into a
  reusable `handleVerify(rawHash)` used by both the form's submit
  handler and a mount-only effect (guarded with a `useRef` flag so it
  fires once, not on every re-render): if `?hash=` is present, the
  input is populated and the query auto-fires immediately, landing
  straight on the found/rejected state without a manual submit.
- `frontend/app/(platform)/verify/page.tsx` — `useSearchParams` is a
  client hook, but the page still exports `metadata` (server-only), so
  the param-reading moved down into `VerifyPanel` itself; the page now
  just wraps it in `<Suspense>` per Next.js's requirement for any
  component using `useSearchParams`, and stays statically prerendered
  (confirmed `○ /verify` in the build output, not forced dynamic).
- `frontend/components/dashboard/ledger-row.tsx` — the dashboard
  ledger's Document Hash cell is now a `next/link` to
  `/verify?hash=${hash}`, styled with the same bordered
  hover-invert (`hover:bg-black hover:text-white`) treatment the Asset
  Vault's "[ View Hash ]" link already used — `asset-ledger.tsx`
  needed no changes since it was already wired this way from an
  earlier session.

Verified for real in a live browser (Playwright + system Chrome, not
just code review): seeded a record into `localStorage`, confirmed the
dashboard ledger row renders a real `<a href="/verify?hash=...">`,
clicked it and watched it land on the Verify page with the input
already filled and "Verified: Anchor Record Found" already showing
(no manual submit); repeated the same check for a direct
`/verify?hash=...` navigation (no prior click) and for the existing
vault "[ View Hash ]" link, both auto-verify correctly; confirmed
visiting `/verify` with no query param still starts idle with an empty
input (no auto-fire, no loop). Also caught and fixed an unrelated
stale dev-server process on port 3000 serving 404s for its own static
chunks — killed it and started a clean one before testing. `tsc
--noEmit` and `next build` both pass clean.

**Session 24 — Direct Block Explorer links (2026-07-17)**
Every anchor's real Stellar transaction hash is now captured, persisted,
and surfaced as a clickable link straight to Stellar Expert, both from
the dashboard ledger and from the Verify portal's Audit Trail.

- `frontend/app/api/v1/anchor/route.ts` — the confirmed transaction
  hash is now also returned under an explicit `txHash` key (alongside
  the pre-existing `id` field, kept for backward compat with the
  documented response shape) for headless API callers.
- `frontend/components/dashboard/verification-workspace.tsx` — the
  actual UI anchoring path doesn't go through that API route at all;
  it signs and submits directly via Freighter (`runAnchor`,
  `lib/soroban.ts`'s `submitSignedTransaction`), which already returns
  the real tx hash. That value is now passed into `addRecord(...
  txHash)` instead of being discarded — this was the real gap, since
  the dashboard ledger is populated from this path, not the API route.
- `frontend/lib/useLedgerStore.ts` — `AnchorRecord` gained an optional
  `txHash?: string`, persisted to `localStorage` like every other
  field.
- `frontend/lib/soroban.ts` — `ComplianceRecord` gained an optional
  `txHash?: string` so the Verify portal can carry it through;
  `queryVerifyProof` (pure on-chain lookup) never sets it, since the
  contract's `anchor_proof` state doesn't store the submitting
  transaction's own hash — only locally-anchored records (found via
  `findLocalRecord`) have one.
- `frontend/components/dashboard/ledger-row.tsx` +
  `verification-ledger.tsx` — added a 4th "Transaction" column; when a
  row has a `txHash` it renders a bordered `[ TX ]` link to
  `https://stellar.expert/explorer/testnet/tx/${txHash}`
  (`target="_blank" rel="noopener noreferrer"`, hover-invert to
  black/white); rows anchored before this session (no `txHash`) show a
  plain `—`.
- `frontend/components/verify/audit-trail.tsx` — "NODE 2: PROTOCOL
  ESCROW" now renders an extra "View on Ledger: [ txHash truncated ]"
  line (same `target`/`rel` and hover-invert treatment, colors flipped
  for the black panel) only when a `txHash` is available, so a
  pure-chain verification (no local record) doesn't show a broken or
  missing link.

Verified for real in a live browser (Playwright + system Chrome):
seeded a `localStorage` record with a `txHash`, confirmed the
dashboard's `[ TX ]` link has the correct `href`/`target`/`rel` and
visually inverts on hover; confirmed the same record's Verify-portal
deep link renders "View on Ledger" with a working link to the same
URL; confirmed a record with no `txHash` renders `—` in the ledger
instead of a broken link or crash. Also hit and diagnosed a second
stale-dev-server symptom this session — a `next dev` process left
running from before these edits started serving 404s for its own
chunks on `page.reload()` even though a fresh `curl` to it looked
fine; killed it and started a genuinely fresh process before
re-verifying. `tsc --noEmit` and `next build` both pass clean.

**Session 25 — Smart contract error-handling translation (2026-07-17)**
Raw Soroban/WASM failures no longer leak a stack trace or RPC
diagnostic dump into the terminal — they're translated into clean,
monochrome institutional alerts before they ever reach `appendLine`.

- `frontend/lib/soroban.ts` — new `translateContractError(err)`. Maps
  a real duplicate-hash panic to `[REJECTED] CRYPTOGRAPHIC ATTESTATION
  COLLISION // PROOF ALREADY EXISTS ON LEDGER. STATE IMMUTABILITY
  PRESERVED.`, and network/timeout/gas-shaped failures to `[FAILURE]
  INSUFFICIENT GAS OR NETWORK TIMEOUT // SOROBAN RPC TRANSIT
  INTERRUPTED.`. Anything matching neither — e.g. the user just
  declining the Freighter signature prompt — returns `null` so the
  caller keeps its own real message instead of a mislabeled one.
- `frontend/components/dashboard/verification-workspace.tsx` —
  `runAnchor`'s catch block (the actual anchoring function's real
  try/catch) calls `translateContractError` first and only falls back
  to the old raw `[ERROR] Transaction failed: ...` line when it
  returns `null`.
- `frontend/components/dashboard/terminal-console.tsx` — lines
  starting with `[REJECTED]` or `[FAILURE]` now render as a bold
  black-on-white, black-bordered box instead of plain white terminal
  text, so a translated alert visually stands out from routine
  `[SYSTEM]`/`[NETWORK]`/`[SOROBAN]` log lines without using any red —
  purely monochrome, consistent with the rest of the brutalist UI.

**A real bug was caught and fixed after initial "verification" missed
it**: the first pass matched the duplicate-hash signature against the
literal string `"hash already anchored"` — the contract's Rust panic
text (`contracts/src/lib.rs`) — reasoning it would surface inside the
RPC's diagnostic event dump. It doesn't. The release WASM build strips
custom panic strings for binary size, so a real duplicate-hash call
never contains that text at all. This was only caught because the user
reported seeing `[FAILURE] ... NETWORK TIMEOUT` for a file that was
already anchored — confirmed by reproducing it for real against
Testnet (not just re-reading the code): anchored a hash twice with a
funded throwaway account via a scratch Node script hitting the real
RPC, and captured the actual thrown error text:
`HostError: Error(WasmVm, InvalidAction)` with diagnostic event data
`"VM call trapped: UnreachableCodeReached"` — no trace of the original
message. Since `anchor_proof` is the contract's only panic path
(`verify_proof` never panics, and every other input is validated
client-side before submission), that generic VM-trap signature is, in
practice, always the duplicate-hash case for this contract, so
`DUPLICATE_HASH_SIGNATURE` now matches on
`UnreachableCodeReached|VM call trapped|Error\(WasmVm,\s*InvalidAction\)`
(keeping the literal string match too, in case a future build ever
does include it), checked *before* the generic network/gas signature
so it takes priority. Re-verified the corrected regex against the real
captured error text plus the existing timeout/network/unrelated cases
— all classify correctly now.

The rendering itself (bold black-on-white boxed alert in
`TerminalConsole`, distinct from plain log lines, no red) was verified
in a real browser via the established temporary-debug-hook pattern — a
`window.__debugAppendLine` hook calling the workspace's real
`appendLine`, screenshotted, then fully removed and confirmed gone via
`git diff` and a repo-wide grep. `tsc --noEmit` and `next build` both
pass clean.

**Session 26 — Local file previewer, core workspace finalized (2026-07-17)**
`Dropzone` now renders a local, memory-only thumbnail of the dropped
file before anchoring — no network round-trip, reinforcing the
zero-knowledge architecture (the raw file already never left the
browser to compute its hash; now it doesn't leave the browser to
preview it either).

- `frontend/components/dashboard/dropzone.tsx` — added local
  `previewFile`/`previewUrl` state, decoupled from the parent's
  hash-only `VerifiedFile`. `loadPreview()` calls
  `URL.createObjectURL(file)` immediately on drop/select (before the
  parent's async hashing even starts) and revokes the *previous*
  object URL first if one existed; a `useEffect` cleanup revokes the
  current one on unmount. Image files (`file.type.startsWith("image/")`)
  render via a plain `<img>` (a local `blob:` URL isn't something
  `next/image` optimizes, so the lint rule is explicitly suppressed
  with a comment explaining why) with `grayscale contrast-125` forcing
  it into the monochrome palette; everything else renders a stark
  `border-2 border-black` square with a large `[ PDF ]`/`[ DOC ]`/etc.
  extension block (derived from the filename, not a hardcoded list).
  A `[ X ] REMOVE` button sits in the top-right corner of the preview
  box, revokes the object URL, clears local preview state, resets the
  file input, and calls a new `onClear` prop.
- `frontend/components/dashboard/verification-workspace.tsx` — added
  `handleClear()` (resets `file`/`status`/`terminalLines`/
  `anchorResult`/`pendingAnchor` back to idle) wired into `Dropzone`'s
  new `onClear` prop, so removing the preview genuinely resets the
  whole pipeline rather than leaving a stale hash/status behind.

**A real bug was caught and fixed during verification, not just
claimed clean**: the `[ X ] REMOVE` button was unclickable — Playwright
reported the `<img>` intercepting pointer events at the button's
screen position. Confirmed for real via
`document.elementFromPoint()` at the button's exact center: the `img`
was the actual hit target, not the button, despite the button being
`position: absolute`. Root cause: a CSS `filter` (the `grayscale
contrast-125` classes) establishes its own stacking context per spec,
which was enough to paint the image over the button in this browser
even though it's `position: static`. Fixed by giving the button an
explicit `z-10`. Re-verified after the fix: clicking `[ X ] REMOVE`
now actually works.

Verified for real in a live browser (Chrome via Playwright, using
`setInputFiles` since real OS drag-and-drop can't be scripted): a real
PNG renders as a grayscale/high-contrast thumbnail; a non-image file
renders the `[ PDF ]` block; the remove button clears the preview and
returns the dropzone to its idle state; dropping a second, genuinely
different file while a preview is showing revokes the first object URL
immediately (confirmed via a `fetch()` against the old blob URL
failing) while the new one stays valid; removing the second file
revokes it too. `tsc --noEmit` and `next build` both pass clean with
zero lint warnings.

This closes out the "robust functionality sprint" — every planned
feature (deep-linking, block explorer links, contract error
translation, and now the local file previewer) is built and verified
for real. The core anchoring workspace (drop → preview → hash →
anchor → receipt) is feature-complete.

**Session 27 — `@axiom/sdk` scaffolded, core client implemented (2026-07-18)**
Axiom gets its first external-facing surface beyond the dashboard
itself: a standalone TypeScript package at `/sdk` (independent of
`frontend/`'s `node_modules`, same pattern as `contracts/`) that wraps
the headless `/api/v1/anchor` REST endpoint for Node/Edge integrators.

- `sdk/package.json` — `@axiom/sdk` v0.1.0, `main`/`types` pointing at
  `dist/index.js`/`dist/index.d.ts`, a single `typescript` devDependency,
  `node >=18` engine constraint (for global `fetch`).
- `sdk/tsconfig.json` — `target: ES2020`, `module: commonjs`,
  `lib: ["ES2020", "DOM"]` (the `DOM` lib is only there for `fetch`/
  `Response` typings, not for browser APIs — this still runs in
  Node/Edge), declarations + source maps on, `rootDir: src` →
  `outDir: dist`.
- `sdk/src/index.ts` — exports `AxiomClient`, `AxiomAPIError`, and the
  `AxiomClientConfig`/`AxiomReceipt` types. The constructor takes
  `{ apiKey, environment?, baseUrl? }`; `environment` (`"testnet" |
  "mainnet"`, defaults to `"testnet"`) selects a default base URL —
  since there's no separately hosted Testnet API domain yet, `testnet`
  defaults to the Next.js app's own local dev server
  (`http://localhost:3000/api/v1`), overridable via `baseUrl` for a
  real deployment. `anchorDocument(hash, issuerAddress)` POSTs to
  `/anchor` with the real request shape the route expects (`{ hash,
  issuer }`, not `issuerAddress` — the SDK's friendlier param name is
  remapped internally), injects `Authorization: Bearer ${apiKey}`,
  and maps the route's actual response shape (`{ id, txHash, status,
  hash, ledger: { network, contract_id, timestamp } }`) into the
  typed `AxiomReceipt`. Any non-2xx response throws `AxiomAPIError`
  (`status`, `message`, raw `body`) built from the route's real `{
  error: string }` error shape.

Verified for real, not just compiled: ran `npm install` and `npm run
build` inside `/sdk` — clean `tsc` build, real `dist/index.js` +
`dist/index.d.ts` produced. Then exercised the built package against
the actual running Next.js dev server (fresh instance, not a stale
one) with a real funded Testnet keypair reused from earlier sessions:
an invalid API key correctly throws `AxiomAPIError` with `status 401`
and the route's real message; a malformed hash correctly throws with
`status 400`; a real `anchorDocument` call with a fresh hash actually
anchors on Testnet and returns a fully-populated `AxiomReceipt` with a
real transaction hash, matching contract ID, and confirmed status; a
second call with that same hash correctly throws `AxiomAPIError`
(`status 400` — the duplicate panic is caught at the simulation stage
before submission, so it's a 400 not a 500) with the same raw
`HostError`/`UnreachableCodeReached` diagnostic text the terminal
console's error translator (Session 25) already knows how to
recognize. `sdk/dist` and `sdk/node_modules` are gitignored, matching
`frontend/`'s pattern; `sdk/package-lock.json` is committed, also
matching `frontend/`'s pattern.

## Not built yet

- `@axiom/sdk` only wraps `anchorDocument` — no `verifyProof` read
  method yet, no test suite, no published npm package (it's a local
  scaffold only), and `mainnet`'s default base URL
  (`https://api.axiom.sh/v1`) is a placeholder domain, not a real
  deployment.
- No real per-key auth or rate limiting on `/api/v1/anchor` — the
  Bearer check only validates a token *shape* (`ax_live_` prefix), not
  a real issued/revocable API key, and there's no persistence of which
  key anchored what. Fine for this stage, not production-ready.
- No contract unit tests yet.
- Not tested against a real Freighter installation or a real browser
  signature popup (this machine doesn't have the extension) — the
  underlying sign/submit/confirm pipeline was verified for real
  against Testnet (see Session 6), but with a raw keypair standing in
  for Freighter's signing step specifically. This also means the
  Session 7 "Download Receipt" button swap has never been triggered
  by an actual successful anchor in the browser, only verified by
  code review + a standalone PDF-content check.
