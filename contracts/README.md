# Axiom Compliance Contract

Soroban smart contract that anchors a client-computed document hash to
the ledger. See `src/lib.rs` for the two contract functions,
`anchor_proof` and `verify_proof`.

## Building

```sh
stellar contract build
```

Produces `target/wasm32v1-none/release/axiom_contract.wasm`.

### Windows build note

If `stellar contract build` fails while linking host build-scripts
(`proc-macro2`, `quote`, etc.) with errors like `unable to find
library -lgcc_eh`, it's because this machine has two MinGW
toolchains installed and PATH resolves `x86_64-w64-mingw32-gcc` to an
LLVM-based one (from the `llvm-mingw` package) that doesn't ship
GCC's runtime archives. Prefix the command with a real GNU mingw64
`bin` directory (e.g. from a WinLibs/MSYS2 install) to fix it for
that invocation:

```sh
PATH="/path/to/mingw64/bin:$PATH" stellar contract build
```
