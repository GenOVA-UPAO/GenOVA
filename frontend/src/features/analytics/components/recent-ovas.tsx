import { OvaStatusBadge } from "@/core/components/ova-status-badge";

import type { RecentOva } from "../lib/types";
import { AnalyticsPanel } from "./analytics-panel";

interface RecentOvasProps {
  ovas: RecentOva[];
  className?: string;
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-PE", { day: "numeric", month: "short" }).replace(".", "");
}

export function RecentOvas({ ovas, className }: Readonly<RecentOvasProps>) {
  return (
    <AnalyticsPanel title="Actividad reciente" className={className}>
      {ovas.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todavía no se ha creado ningún OVA. La actividad aparecerá aquí.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {ovas.map((o) => {
            const title = o.title && o.title.length > 0 ? o.title : "Sin título";
            return (
              <li key={o.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" title={title}>
                    {title}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{o.owner_name}</p>
                </div>
                <OvaStatusBadge status={o.status} className="shrink-0" />
                <time
                  dateTime={o.created_at}
                  className="w-12 shrink-0 text-right text-xs text-muted-foreground tabular-nums"
                >
                  {formatDate(o.created_at)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </AnalyticsPanel>
  );
}
