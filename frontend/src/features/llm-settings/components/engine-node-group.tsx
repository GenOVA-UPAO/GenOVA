import type { ReactNode } from "react";

export function EngineNodeGroup({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">{children}</ul>
    </div>
  );
}
