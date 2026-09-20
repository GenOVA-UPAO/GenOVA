import { Link } from "react-router";

import { EmptyState } from "@/core/components/empty-state";
import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { OvaListItem } from "../lib/types";
import { formatDate, STATUS_STYLE } from "../pages/dashboard-page.helpers";

interface DashboardRecentActivityProps {
  recentOvas: OvaListItem[];
  isAdmin: boolean;
}

function resolveOwnerName(ova: OvaListItem): string {
  const owner = ova.owner as { full_name?: string } | undefined;
  return owner?.full_name ?? "";
}

function resolveDateLabel(ova: OvaListItem): string {
  const created = ova.created_at;
  const updated = ova.updated_at;
  return formatDate((created ?? updated) as string | undefined);
}

/** Lista de actividad reciente del dashboard con fallback a EmptyState. */
export function DashboardRecentActivity({
  recentOvas,
  isAdmin,
}: Readonly<DashboardRecentActivityProps>) {
  if (recentOvas.length === 0) {
    return (
      <EmptyState
        icon="plus"
        title="Crea tu primer OVA"
        description="Describe un tema y la inteligencia artificial generará todo el contenido educativo de acuerdo a la metodología 5E."
        action={
          <Button asChild className="gap-1.5 shadow-sm">
            <Link to="/crear">
              <Icon name="plus" size="text-base" />
              Comenzar ahora
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {recentOvas.map((ova) => {
        const ownerName = resolveOwnerName(ova);
        const style = STATUS_STYLE[ova.status ?? ""] ?? "bg-muted text-muted-foreground";

        return (
          <div
            key={ova.id}
            className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card/60 px-5 py-4 backdrop-blur-sm transition hover:border-primary/30"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon name="folder" size="text-xl" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                {ova.title ?? "Sin título"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {resolveDateLabel(ova)}
                {isAdmin && ownerName && (
                  <span className="ml-2 text-accent-brand"> · {ownerName}</span>
                )}
              </p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${style}`}
            >
              {ova.status ?? "borrador"}
            </span>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:flex hover:bg-primary/10 hover:text-primary"
            >
              <Link to={`/workspace/${ova.id}`}>Editar</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}
