import type { Creator } from "../lib/types";

interface TopCreatorsProps {
  creators: Creator[];
}

export function TopCreators({ creators }: Readonly<TopCreatorsProps>) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold">Mayores creadores</h2>

      {creators.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin datos todavía.</p>
      ) : (
        <ul className="space-y-2">
          {creators.map((c, i) => (
            <li key={c.user_id} className="flex items-center gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {c.name && c.name.length > 0 ? c.name : c.email}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {c.email}
                </p>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums">
                {c.ova_count}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
