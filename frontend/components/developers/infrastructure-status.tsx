import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/developers/section-header";

export function InfrastructureStatus() {
  return (
    <section>
      <SectionHeader label="Infrastructure" title="Infrastructure Status" />
      <div className="grid grid-cols-1 divide-y divide-black md:grid-cols-2 md:divide-x md:divide-y-0">
        <div className="px-6 py-10 md:px-10">
          <p className="font-mono text-xs uppercase tracking-widest">
            Rate Limits
          </p>
          <p className="mt-4 font-mono text-sm">
            Tier: <span className="font-bold">Institutional</span>
          </p>
          <p className="mt-2 font-mono text-sm">
            Usage: 0 / 10,000 requests per minute
          </p>
          <div className="mt-4 h-2 w-full max-w-xs border border-black">
            <div className="h-full w-0 bg-black" />
          </div>
        </div>

        <div className="px-6 py-10 md:px-10">
          <p className="font-mono text-xs uppercase tracking-widest">
            Webhooks
          </p>
          <p className="mt-4 font-mono text-sm">
            Endpoint URL: None configured
          </p>
          <div className="mt-6">
            <Button disabled className="px-6 py-3 text-xs">
              Add Webhook
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
