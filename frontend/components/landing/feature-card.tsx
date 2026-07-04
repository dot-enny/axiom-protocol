interface FeatureCardProps {
  index: string;
  title: string;
  description: string;
}

export function FeatureCard({ index, title, description }: FeatureCardProps) {
  return (
    <div className="flex-1 px-8 py-10 md:px-10 md:py-12">
      <span className="font-mono text-sm text-slate-400">{index}</span>
      <h3 className="mt-4 text-2xl font-bold tracking-tight">{title}</h3>
      <p className="mt-3 leading-relaxed text-slate-600">{description}</p>
    </div>
  );
}
