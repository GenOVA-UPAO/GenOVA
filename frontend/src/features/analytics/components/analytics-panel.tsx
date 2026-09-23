import type { ReactNode } from "react";

import { cn } from "@/core/lib/cn";

interface AnalyticsPanelProps {
  title: string;
  children: ReactNode;
  className?: string;
}

/** Contenedor de una sección de analítica con su título. */
export function AnalyticsPanel({ title, children, className }: Readonly<AnalyticsPanelProps>) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}
