import { Link } from "react-router";

import { Icon } from "@/core/components/icon";

import { ADMIN_CARDS } from "../pages/dashboard-page.helpers";

/** Panel de accesos directos de administración en el dashboard. */
export function DashboardAdminPanel() {
  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-6 backdrop-blur-sm">
      <h2 className="px-1 font-display text-xl font-semibold">Panel de administración</h2>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {ADMIN_CARDS.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="group rounded-xl border border-border/50 bg-background/50 p-5 transition hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
          >
            <div className="mb-4 inline-flex rounded-lg bg-muted p-2.5 text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon name={card.icon} size="text-xl" />
            </div>
            <p className="text-sm font-bold text-foreground">{card.title}</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
