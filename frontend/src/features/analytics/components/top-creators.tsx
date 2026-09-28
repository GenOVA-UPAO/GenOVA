import type { Creator } from "../lib/types";
import { AnalyticsPanel } from "./analytics-panel";

interface TopCreatorsProps {
  creators: Creator[];
}

function ovaCountLabel(count: number): string {
  return count === 1 ? "1 OVA" : `${String(count)} OVAs`;
}

export function TopCreators({ creators }: Readonly<TopCreatorsProps>) {
  return (
    <AnalyticsPanel title="Mayores creadores">
      {creators.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aparecerán aquí cuando alguien cree su primer OVA.
        </p>
      ) : (
        <ol className="divide-y divide-border">
          {creators.map((c, i) => (
            <li key={c.user_id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="w-4 shrink-0 text-sm text-muted-foreground tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                {/* Sin nombre, el correo pasa a ser el título y no se repite debajo. */}
                <p className="truncate text-sm font-medium" title={c.name ?? c.email}>
                  {c.name && c.name.length > 0 ? c.name : c.email}
                </p>
                {c.name && c.name.length > 0 ? (
                  <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm tabular-nums">{ovaCountLabel(c.ova_count)}</span>
            </li>
          ))}
        </ol>
      )}
    </AnalyticsPanel>
  );
}
