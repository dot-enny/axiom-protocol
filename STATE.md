# Axiom Protocol — Project State

This file is the running memory for Claude across sessions. Update the
"Built so far" and "Not built yet" sections at the end of every session.

## Architecture

Monorepo: `frontend/` (Next.js 14 App Router, TypeScript, Tailwind v3) +
`contracts/` (empty, reserved for a future Rust/Soroban workspace).
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

## Not built yet

- No real SHA-256 hashing — the dashboard's Dropzone/Terminal are UI
  simulations only, per `.clauderules`' explicit staging.
- No Soroban contract code in `contracts/` (still empty).
- No real wallet connection — "Connect Wallet" is a placeholder with
  no click handler. README.md mentions `@stellar/freighter-api` /
  `@stellar/stellar-sdk` as the intended integration; neither is
  installed yet.
- No auth, no backend, no real on-chain calls anywhere in the app.
- The Verification Ledger is static mock data — nothing reads from
  Soroban or any backend yet.
