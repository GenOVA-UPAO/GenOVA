import { ChangeDetectionStrategy, Component, computed, inject } from "@angular/core";
import { RouterLink } from "@angular/router";

import { AuthService } from "@/core/auth/auth.service";
import { IconComponent } from "@/core/components/icon.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import type { OvaListItem } from "../lib/types";
import { OvaLibraryService } from "../services/ova-library.service";
import { ADMIN_CARDS, formatDate, STATUS_STYLE } from "./dashboard-page.helpers";
import { DashboardStatCardComponent } from "./dashboard-stat-card.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-dashboard-page",
  imports: [RouterLink, ButtonComponent, DashboardStatCardComponent, IconComponent],
  templateUrl: "./dashboard-page.html",
})
export class DashboardPage {
  authService = inject(AuthService);
  libraryService = inject(OvaLibraryService);

  adminCards = ADMIN_CARDS;
  format = formatDate;

  // Since OvaLibraryService loads the first page automatically (and has limit = 12),
  // we can just derive stats from the activeOvas resource. If we needed a separate
  // fetch for stats we'd create a new resource, but this suffices for the port.

  user = this.authService.user;

  firstName = computed(() => {
    const fullName = this.user()?.full_name || "Usuario";
    return fullName.split(" ")[0];
  });

  isAdmin = computed(() => this.user()?.role === "administrador");

  ovas = computed(() => this.libraryService.activeOvas.value()?.ovas || []);
  total = computed(() => this.libraryService.activeOvas.value()?.total_items || 0);

  recentOvas = computed(() => this.ovas().slice(0, 4));

  stats = computed(() => {
    const all = this.ovas();
    const ready = all.filter((ova) => ova.status === "listo").length;
    const active = all.filter((ova) => ova.status === "generando").length;

    return [
      {
        label: "OVAs Creadas",
        value: this.total() || all.length,
        sub: "Total en tu biblioteca",
        tone: "text-primary",
      },
      {
        label: "En Progreso",
        value: active,
        sub: "Generaciones activas",
        tone: "text-accent-brand",
      },
      {
        label: "Listas",
        value: ready,
        sub: "Preparadas para exportar",
        tone: "text-emerald-600 dark:text-emerald-400",
      },
    ];
  });

  statusStyle(status: string): string {
    return STATUS_STYLE[status] || "bg-muted text-muted-foreground";
  }

  formatDateLabel(ova: OvaListItem): string {
    const created = ova["created_at"];
    const updated = ova["updated_at"];
    return formatDate((created || updated) as string | undefined);
  }

  ownerName(ova: OvaListItem): string {
    const owner = ova["owner"] as { full_name?: string } | undefined;
    return owner?.full_name || "";
  }
}
