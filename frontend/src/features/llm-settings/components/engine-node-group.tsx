import type { ReactNode } from "react";

export function EngineNodeGroup({
  title,
  children,
}: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <div className="glass-card overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="border-b border-border/50 bg-muted/20 px-6 py-4">
        <p className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
          {title}
        </p>
      </div>
      <div className="flex flex-col">{children}</div>
    </div>
  );
}
