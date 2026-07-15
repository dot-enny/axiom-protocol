interface SectionHeaderProps {
  label: string;
  title: string;
}

export function SectionHeader({ label, title }: SectionHeaderProps) {
  return (
    <div className="border-b border-black px-6 py-10 md:px-10">
      <p className="font-mono text-xs uppercase tracking-widest text-slate-500">
        {`// ${label}`}
      </p>
      <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
        {title}
      </h2>
    </div>
  );
}
