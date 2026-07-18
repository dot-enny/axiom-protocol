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
    const receipt = await client.anchorDocument(
      dummyDocumentHash(),
      DUMMY_ISSUER
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
