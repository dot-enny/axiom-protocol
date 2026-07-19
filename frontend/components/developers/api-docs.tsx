import { SectionHeader } from "@/components/developers/section-header";

const REQUEST_EXAMPLE = `// POST /v1/anchor
curl -X POST https://api.axiom.sh/v1/anchor \\
  -H "Authorization: Bearer ax_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "hash": "cddf01e5b3...",
    "issuer": "GABC...",
    "network": "stellar-testnet"
  }'`;

const RESPONSE_EXAMPLE = `// 200 OK
{
  "id": "anch_8f72kx9",
  "status": "confirmed",
  "hash": "cddf01e5b3...",
  "ledger": {
    "network": "stellar-testnet",
    "contract_id": "CAH3EF2GDWWJTO24RRFUAPA4RB7DGJD36OSZSWKHBDFS3LHHYIERYO6X",
    "timestamp": 1720625198
  }
}`;

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-none border border-black bg-black text-white">
      <div className="flex items-center gap-2 border-b border-white/20 px-4 py-3">
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="h-2.5 w-2.5 border border-white" />
        <span className="ml-2 font-mono text-xs uppercase tracking-widest text-white">
          {title}
        </span>
      </div>
      <pre className="overflow-x-auto p-6 font-mono text-sm leading-relaxed text-white">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function ApiDocs() {
  return (
    <section>
      <SectionHeader label="Documentation" title="REST API" />
      <div className="px-6 py-10 md:px-10">
        <p className="max-w-lg font-mono text-sm">
          Anchor a document hash programmatically. The same
          `anchor_proof` invocation the dashboard submits over Freighter
          is available headlessly here.
        </p>

        <div className="mt-6 space-y-6">
          <CodeBlock title="request.sh" code={REQUEST_EXAMPLE} />
          <CodeBlock title="response.json" code={RESPONSE_EXAMPLE} />
        </div>
      </div>
    </section>
  );
}
