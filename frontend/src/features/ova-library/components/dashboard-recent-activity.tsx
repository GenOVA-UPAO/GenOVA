import { Link } from "react-router";

import { EmptyState } from "@/core/components/empty-state";
import { Icon } from "@/core/components/icon";
import { OvaStatusBadge } from "@/core/components/ova-status-badge";
import { Button } from "@/core/components/ui/button";

import { lastActivity, ownerNameOf } from "../lib/ova-card-format";
import type { OvaListItem } from "../lib/types";
import { OvaCardMeta } from "./cards/ova-card-meta";

interface DashboardRecentActivityProps {
  recentOvas: OvaListItem[];
  isAdmin: boolean;
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
        description="Describe un tema y GenOVA generará los recursos de cada fase del modelo 5E. Luego podrás revisarlos, ajustarlos y exportarlos a SCORM."
        action={
          <Button asChild size="lg">
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
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
      {recentOvas.map((ova) => {
        const title = ova.title?.trim() ? ova.title : "Sin título";
        return (
          <li key={ova.id}>
            <Link
              to={`/workspace/${ova.id}`}
              className="group flex items-center gap-3 px-4 py-3.5 transition-colors outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:gap-4 sm:px-5"
            >
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium break-words text-foreground sm:line-clamp-1" title={title}>
                  {title}
                </p>
                <div className="mt-0.5">
                  <OvaCardMeta ownerName={isAdmin ? ownerNameOf(ova) : ""} activity={lastActivity(ova)} />
                </div>
              </div>
              <OvaStatusBadge status={ova.status} />
              <Icon
                name="caret-right"
                size="text-base"
                className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
