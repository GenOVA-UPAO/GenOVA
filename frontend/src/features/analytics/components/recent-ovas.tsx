import type { RecentOva } from "../lib/types";

interface RecentOvasProps {
  ovas: RecentOva[];
}

const STATUS_BADGE: Record<string, string> = {
  listo: "bg-emerald-500/15 text-emerald-600",
  generando: "bg-amber-500/15 text-amber-600",
  borrador: "bg-slate-400/15 text-slate-500",
  error: "bg-red-500/15 text-red-600",
};

function getStatusBadge(status: string): string {
  return STATUS_BADGE[status] ?? "bg-muted text-muted-foreground";
}

function formatDate(iso?: string): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(iso).toLocaleDateString("es-PE", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return "—";
  }
}

export function RecentOvas({ ovas }: Readonly<RecentOvasProps>) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold">Actividad reciente</h2>

      {ovas.length === 0 ? (
        <p className="text-xs text-muted-foreground">Sin OVAs recientes.</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {ovas.map((o) => {
            const title = o.title && o.title.length > 0 ? o.title : "Sin título";
            return (
              <li key={o.id} className="flex items-center gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={title}>
                    {title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.owner_name}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${getStatusBadge(
                    o.status,
                  )}`}
                >
                  {o.status}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatDate(o.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
