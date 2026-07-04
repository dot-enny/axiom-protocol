import { SnapIn } from "@/components/motion/snap-in";
import { GridLine } from "@/components/motion/grid-line";

interface MetricItemProps {
  value: string;
  label: string;
  subtext: string;
  index: number;
}

export function MetricItem({ value, label, subtext, index }: MetricItemProps) {
  const isFirst = index === 0;

  return (
    <div className="relative flex-1 px-8 py-12 md:px-10">
      {!isFirst && (
        <GridLine
          edgeClassName="border-t md:border-t-0 md:border-l"
          delay={index * 0.06}
        />
      )}
      <SnapIn delay={index * 0.06}>
        <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
          {label}
        </p>
        <p className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
          {value}
        </p>
        <p className="mt-2 text-sm text-slate-600">{subtext}</p>
      </SnapIn>
    </div>
  );
}
