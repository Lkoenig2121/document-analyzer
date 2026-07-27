import type { ReactNode } from 'react';

interface AnalysisSectionProps {
  title: string;
  children: ReactNode;
}

export default function AnalysisSection({ title, children }: AnalysisSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-zinc-900">{title}</h3>
      {children}
    </section>
  );
}
