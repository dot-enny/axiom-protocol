"use client";

interface AnchorConfigProps {
  threshold: number;
  onThresholdChange: (value: number) => void;
  assetValue: number;
  onAssetValueChange: (value: number) => void;
  isNonFinancial: boolean;
  onNonFinancialChange: (value: boolean) => void;
  disabled?: boolean;
}

const INPUT_CLASS =
  "mt-2 w-full rounded-none border-2 border-black bg-white px-4 py-3 font-mono text-sm text-black focus:border-4 focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50";

export function AnchorConfig({
  threshold,
  onThresholdChange,
  assetValue,
  onAssetValueChange,
  isNonFinancial,
  onNonFinancialChange,
  disabled = false,
}: AnchorConfigProps) {
  return (
    <div className="mt-4 border-2 border-black p-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="anchor-threshold"
            className="block font-mono text-xs uppercase tracking-widest"
          >
            Required Signatures (1-3)
          </label>
          <input
            id="anchor-threshold"
            type="number"
            min={1}
            max={3}
            step={1}
            value={threshold}
            disabled={disabled}
            onChange={(e) =>
              onThresholdChange(Math.min(3, Math.max(1, Number(e.target.value) || 1)))
            }
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label
            htmlFor="anchor-value"
            className="block font-mono text-xs uppercase tracking-widest"
          >
            Declared Asset Value (USD)
          </label>
          <input
            id="anchor-value"
            type="number"
            min={0}
            step={1}
            value={isNonFinancial ? 0 : assetValue}
            disabled={disabled || isNonFinancial}
            onChange={(e) => onAssetValueChange(Math.max(0, Number(e.target.value) || 0))}
            className={INPUT_CLASS}
          />
        </div>
      </div>

      <label className="mt-4 flex w-fit cursor-pointer items-center gap-3 font-mono text-xs uppercase tracking-widest">
        <input
          type="checkbox"
          checked={isNonFinancial}
          disabled={disabled}
          onChange={(e) => onNonFinancialChange(e.target.checked)}
          className="sr-only"
        />
        <span aria-hidden className="font-bold">
          {isNonFinancial ? "[X]" : "[ ]"}
        </span>
        Non-Financial / Compliance Document
      </label>
    </div>
  );
}
