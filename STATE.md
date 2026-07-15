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

## Not built yet

- No auth, no backend.
- The Verification Ledger (on the `/dashboard` route) is still static
  mock data — nothing there reads from Soroban yet. The public
  `/verify` portal (Session 8) does read real ledger state now, but
  it's a separate, purpose-built read path, not a wiring-up of the
  existing ledger table.
- No contract unit tests yet.
- Not tested against a real Freighter installation or a real browser
  signature popup (this machine doesn't have the extension) — the
  underlying sign/submit/confirm pipeline was verified for real
  against Testnet (see Session 6), but with a raw keypair standing in
  for Freighter's signing step specifically. This also means the
  Session 7 "Download Receipt" button swap has never been triggered
  by an actual successful anchor in the browser, only verified by
  code review + a standalone PDF-content check.
