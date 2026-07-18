export type AxiomEnvironment = "testnet" | "mainnet";

export interface AxiomClientConfig {
  /** Bearer token sent as `Authorization: Bearer <apiKey>` on every request. */
  apiKey: string;
  /** Selects the default base URL. Defaults to "testnet". */
  environment?: AxiomEnvironment;
  /**
   * Overrides the environment-derived base URL entirely — mainly for
   * pointing at a local Next.js dev server (`http://localhost:3000/api/v1`)
   * or a self-hosted deployment.
   */
  baseUrl?: string;
}

/** The confirmed on-chain result of an `anchorDocument` call. */
export interface AxiomReceipt {
  /** The Stellar transaction hash the anchor was submitted and confirmed under. */
  transactionId: string;
  /** The document hash that was anchored (normalized lowercase hex). */
  hash: string;
  /** "confirmed" once the transaction has settled on the ledger. */
  status: string;
  /** e.g. "stellar-testnet" / "stellar-mainnet". */
  network: string;
  /** The deployed AxiomContract contract ID this anchor was written to. */
  contractId: string;
  /** Unix seconds — server time the anchor was confirmed at. */
  timestamp: number;
}

/** Thrown for any non-2xx response from the Axiom API. */
export class AxiomAPIError extends Error {
  /** The HTTP status code returned by the API. */
  readonly status: number;
  /** The raw parsed response body, if any, for callers who need more detail. */
  readonly body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "AxiomAPIError";
    this.status = status;
    this.body = body;
  }
}

// There's no separately hosted Testnet API domain yet — the real
// /api/v1/anchor route this SDK wraps currently only runs inside the
// Next.js app itself, so "testnet" defaults to its local dev server.
// A real deployment should override this via `baseUrl`.
const DEFAULT_BASE_URLS: Record<AxiomEnvironment, string> = {
  testnet: "http://localhost:3000/api/v1",
  mainnet: "https://api.axiom.sh/v1",
};

// The exact shape returned by frontend/app/api/v1/anchor/route.ts.
interface RawAnchorResponse {
  id: string;
  txHash: string;
  status: string;
  hash: string;
  ledger: {
    network: string;
    contract_id: string;
    timestamp: number;
  };
}

interface RawErrorResponse {
  error: string;
}

export class AxiomClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: AxiomClientConfig) {
    if (!config.apiKey) {
      throw new Error("AxiomClient requires a non-empty `apiKey`.");
    }

    this.apiKey = config.apiKey;
    this.baseUrl =
      config.baseUrl ?? DEFAULT_BASE_URLS[config.environment ?? "testnet"];
  }

  /**
   * Anchors a client-computed document hash on-chain, attributed to
   * `issuerAddress`. Mirrors the same `anchor_proof` invocation the
   * Axiom dashboard submits over Freighter, signed headlessly here by
   * the API's own server key instead.
   *
   * @throws {AxiomAPIError} if the API responds with a 4xx/5xx status.
   */
  async anchorDocument(
    hash: string,
    issuerAddress: string
  ): Promise<AxiomReceipt> {
    const response = await fetch(`${this.baseUrl}/anchor`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ hash, issuer: issuerAddress }),
    });

    const body: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      const message =
        body && typeof body === "object" && "error" in body
          ? String((body as RawErrorResponse).error)
          : `Request failed with status ${response.status}`;
      throw new AxiomAPIError(response.status, message, body);
    }

    const receipt = body as RawAnchorResponse;
    return {
      transactionId: receipt.txHash,
      hash: receipt.hash,
      status: receipt.status,
      network: receipt.ledger.network,
      contractId: receipt.ledger.contract_id,
      timestamp: receipt.ledger.timestamp,
    };
  }
}
