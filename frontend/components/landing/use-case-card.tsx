import { SnapIn } from "@/components/motion/snap-in";
import { GridLine } from "@/components/motion/grid-line";

interface UseCaseCardProps {
  title: string;
  description: string;
  dividerEdges: string;
  delay: number;
}

export function UseCaseCard({
  title,
  description,
  dividerEdges,
  delay,
}: UseCaseCardProps) {
  return (
    <div className="relative px-8 py-12 md:px-10">
      {dividerEdges && <GridLine edgeClassName={dividerEdges} delay={delay} />}
      <SnapIn delay={delay}>
        <h3 className="text-3xl font-black tracking-tight">{title}</h3>
        <p className="mt-3 max-w-md leading-relaxed">
          {description}
        </p>
      </SnapIn>
    </div>
  );
}
