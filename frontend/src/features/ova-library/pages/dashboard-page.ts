import { CommonModule } from "@angular/common";
import { Component, computed, inject } from "@angular/core";
import { RouterLink } from "@angular/router";

import { ButtonComponent } from "@/core/components/ui/button.component";
import { AuthService } from "@/features/auth/services/auth.service";
import { OvaLibraryService } from "../../services/ova-library.service";
import { ADMIN_CARDS, formatDate, STATUS_STYLE } from "./dashboard-page.helpers";
import { DashboardStatCardComponent } from "./dashboard-stat-card.component";

@Component({
  selector: "gn-dashboard-page",
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonComponent, DashboardStatCardComponent],
  template: `
    <section class="mx-auto max-w-5xl space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      <!-- Header -->
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-accent-brand">
            UPAO - GenOVA ML
          </p>
          <h1 class="font-display text-4xl font-semibold text-foreground">
            Bienvenido, {{ firstName() }}
          </h1>
          <p class="mt-1.5 text-sm font-medium text-muted-foreground flex items-center gap-1.5">
            <!-- <Clock size={16} /> -->
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm0,192a88,88,0,1,1,88-88A88.1,88.1,0,0,1,128,216Zm64-88a8,8,0,0,1-8,8H128a8,8,0,0,1-8-8V72a8,8,0,0,1,16,0v48h48A8,8,0,0,1,192,128Z"></path></svg>
            Tu espacio para crear y gestionar OVAs con IA.
          </p>
        </div>
        <gn-button
          routerLink="/crear-ova"
          class="self-start gap-2 shadow-lg shadow-primary/25 rounded-xl px-5 h-11 sm:self-auto transition-transform active:scale-95 block"
        >
          Crear OVA
        </gn-button>
      </div>

      <!-- Stats -->
      <div class="grid gap-5 sm:grid-cols-3">
        <gn-dashboard-stat-card
          *ngFor="let stat of stats()"
          [label]="stat.label"
          [value]="stat.value"
          [sub]="stat.sub"
          [tone]="stat.tone"
        ></gn-dashboard-stat-card>
      </div>

      <!-- Recent Activity -->
      <div class="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150 fill-mode-both">
        <div class="mb-5 flex items-center justify-between px-1">
          <h2 class="font-display text-xl font-semibold">Actividad reciente</h2>
          <a
            routerLink="/mis-ovas"
            class="group flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Ver todas
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="transition-transform group-hover:translate-x-1" viewBox="0 0 256 256"><path d="M181.66,133.66l-80,80a8,8,0,0,1-11.32-11.32L164.69,128,90.34,53.66a8,8,0,0,1,11.32-11.32l80,80A8,8,0,0,1,181.66,133.66Z"></path></svg>
          </a>
        </div>
        
        <div class="space-y-3">
          <ng-container *ngIf="recentOvas().length > 0; else emptyState">
            <div
              *ngFor="let ova of recentOvas()"
              class="group flex items-center gap-4 rounded-2xl glass-card px-5 py-4 transition hover:border-primary/30"
            >
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M216,72H130.67L102.93,51.2A16.12,16.12,0,0,0,93.33,48H40A16,16,0,0,0,24,64V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM40,64H93.33l27.74,20.8A16.12,16.12,0,0,0,130.67,88H216v16H40ZM216,200H40V120H216v80Z"></path></svg>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate font-medium text-foreground group-hover:text-primary transition-colors">
                  {{ ova.title }}
                </p>
                <p class="mt-0.5 text-xs text-muted-foreground">
                  {{ format(ova.created_at || ova.updated_at) }}
                  <span *ngIf="isAdmin() && ova.owner" class="ml-2 text-accent-brand">
                    · {{ ova.owner.full_name }}
                  </span>
                </p>
              </div>
              <span
                [class]="statusStyle(ova.status || '')"
                class="shrink-0 rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-bold"
              >
                {{ ova.status || 'borrador' }}
              </span>
              <gn-button
                variant="ghost"
                size="sm"
                [routerLink]="['/ova', ova.id, 'workspace']"
                class="hidden sm:flex hover:bg-primary/10 hover:text-primary"
              >
                Editar
              </gn-button>
            </div>
          </ng-container>

          <ng-template #emptyState>
            <div class="rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-10 text-center transition-colors hover:border-primary/40 hover:bg-primary/10">
              <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-primary mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path></svg>
              </div>
              <p class="font-display text-2xl font-semibold text-primary">Crea tu primer OVA</p>
              <p class="mx-auto mt-2 max-w-md text-sm text-muted-foreground font-medium">
                Describe un tema y la inteligencia artificial generará todo el contenido educativo de acuerdo a la metodología 5E.
              </p>
              <gn-button routerLink="/crear-ova" class="mt-6 rounded-xl shadow-lg shadow-primary/20 block w-fit mx-auto">
                Comenzar ahora
              </gn-button>
            </div>
          </ng-template>
        </div>
      </div>

      <!-- Admin Panel -->
      <div *ngIf="isAdmin()" class="rounded-2xl glass-card p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300 fill-mode-both">
        <h2 class="font-display text-xl font-semibold px-1">Panel de administración</h2>
        <div class="mt-5 grid gap-4 sm:grid-cols-3">
          <a
            *ngFor="let card of adminCards"
            [routerLink]="card.to"
            class="group rounded-xl border border-border/50 bg-background/50 p-5 transition hover:border-primary/50 hover:bg-primary/5 hover:shadow-md"
          >
            <div class="mb-4 inline-flex rounded-lg bg-muted p-2.5 text-muted-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <!-- Placeholder Icon -->
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path></svg>
            </div>
            <p class="text-sm font-bold text-foreground">{{ card.title }}</p>
            <p class="mt-1 text-xs font-medium text-muted-foreground">{{ card.desc }}</p>
          </a>
        </div>
      </div>

    </section>
  `,
})
export class DashboardPage {
  authService = inject(AuthService);
  libraryService = inject(OvaLibraryService);

  adminCards = ADMIN_CARDS;
  format = formatDate;

  // Since OvaLibraryService loads the first page automatically (and has limit = 12),
  // we can just derive stats from the activeOvas resource. If we needed a separate
  // fetch for stats we'd create a new resource, but this suffices for the port.

  user = this.authService.currentUser;

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
}
