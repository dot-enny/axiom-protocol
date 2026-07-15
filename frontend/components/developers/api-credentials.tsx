"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/developers/section-header";

type KeyState = "idle" | "loading" | "ready";

const GENERATE_DELAY_MS = 900;
const COPIED_RESET_MS = 1500;

function generateApiKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `ax_live_${hex}`;
}

export function ApiCredentials() {
  const [keyState, setKeyState] = useState<KeyState>("idle");
  const [apiKey, setApiKey] = useState("");
  const [copied, setCopied] = useState(false);

  function handleGenerate() {
    setKeyState("loading");
    setCopied(false);
    setTimeout(() => {
      setApiKey(generateApiKey());
      setKeyState("ready");
    }, GENERATE_DELAY_MS);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), COPIED_RESET_MS);
  }

  return (
    <section>
      <SectionHeader label="Credentials" title="API Credentials" />
      <div className="px-6 py-10 md:px-10">
        <p className="max-w-lg font-mono text-sm text-slate-500">
          Generate a live secret key to authenticate anchor requests
          against the Axiom API.
        </p>

        <div className="mt-6">
          <Button
            onClick={handleGenerate}
            disabled={keyState === "loading"}
            variant={keyState === "ready" ? "ghost" : "primary"}
            className="px-6 py-3 text-xs"
          >
            {keyState === "loading" && "Generating..."}
            {keyState === "ready" && "Regenerate Key"}
            {keyState === "idle" && "Generate API Key"}
          </Button>
        </div>

        {keyState === "ready" && (
          <div className="mt-6 flex max-w-xl border-2 border-black">
            <input
              readOnly
              value={apiKey}
              className="w-full bg-white px-4 py-4 font-mono text-sm text-black focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="shrink-0 border-l-2 border-black bg-black px-5 font-mono text-xs uppercase tracking-widest text-white transition-colors duration-100 hover:bg-white hover:text-black"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
