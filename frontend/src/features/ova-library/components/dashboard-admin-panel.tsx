import { Link } from "react-router";

import { Icon } from "@/core/components/icon";

import { ADMIN_CARDS } from "../pages/dashboard-page.helpers";

/** Accesos directos de administración en el dashboard. */
export function DashboardAdminPanel() {
  return (
    <section aria-labelledby="accesos-admin">
      <h2 id="accesos-admin" className="mb-3 text-lg font-semibold tracking-tight">
        Administración
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {ADMIN_CARDS.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors outline-none hover:border-primary/40 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon name={card.icon} size="text-xl" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-foreground">{card.title}</span>
              <span className="block text-xs text-muted-foreground">{card.desc}</span>
            </span>
            <Icon
              name="caret-right"
              size="text-base"
              className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
