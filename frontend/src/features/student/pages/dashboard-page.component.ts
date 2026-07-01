import { CommonModule } from "@angular/common";
import { Component, type OnDestroy, type OnInit } from "@angular/core";
import { RouterModule } from "@angular/router";
import { apiFetch } from "../../../core/lib/http";
import type { AuthService } from "../../auth/services/auth.service";
import type { UserLinksService } from "../../profile/services/user-links.service";

interface OvaItem {
  id: string;
  title?: string;
  status?: string;
  created_at?: string;
}

interface LinkItem {
  status: string;
  linked?: { full_name?: string } | null;
}

const STATUS_LABEL: Record<string, string> = {
  listo: "Listo",
  generando: "Generando",
  borrador: "Borrador",
  error: "Error",
};

const STATUS_CLS: Record<string, string> = {
  listo: "bg-emerald-500/15 text-emerald-700 border border-emerald-500/20",
  generando: "bg-blue-500/15 text-blue-700 border border-blue-500/20",
  borrador: "bg-amber-500/15 text-amber-700 border border-amber-500/20",
  error: "bg-destructive/15 text-destructive border border-destructive/20",
};

@Component({
  selector: "gn-dashboard-page",
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div *ngIf="loading" class="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-muted-foreground">
      Cargando...
    </div>

    <div *ngIf="!loading" class="mx-auto max-w-5xl space-y-8 px-4 py-8 animate-in fade-in duration-300">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold tracking-tight">Bienvenido, {{ name }}</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Tu espacio para crear y gestionar OVAs con IA.
          </p>
        </div>
        <a 
          routerLink="/crear-ova" 
          class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 self-start sm:self-auto"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" class="mr-1.5"><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"></path></svg>
          Crear OVA
        </a>
      </div>

      <section class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Mis OVAs recientes</h2>
          <a
            routerLink="/mis-ovas"
            class="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Ver todas →
          </a>
        </div>

        <div *ngIf="ovas.length > 0" class="space-y-3">
          <div
            *ngFor="let ova of ovas"
            class="flex items-center gap-4 rounded-2xl border bg-card px-5 py-4 hover:bg-accent/30 transition-colors"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M216,72H130.67L102.93,51.2A16,16,0,0,0,93.33,48H40A16,16,0,0,0,24,64V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72Zm0,128H40V64H93.33l27.74,20.8a16,16,0,0,0,9.6,3.2H216Z"></path><path d="M224,88V200a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H93.33a8,8,0,0,1,4.8,1.6l27.74,20.8A8,8,0,0,0,130.67,80H216A8,8,0,0,1,224,88Z" opacity="0.2"></path></svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-medium">{{ ova.title || 'Sin título' }}</p>
              <p class="mt-0.5 text-xs text-muted-foreground">{{ fmtDate(ova.created_at) }}</p>
            </div>
            <span class="shrink-0 rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-bold border" [ngClass]="getStatusCls(ova.status)">
              {{ getStatusLabel(ova.status) }}
            </span>
            <a 
              [routerLink]="['/ova', ova.id, 'workspace']" 
              class="hidden sm:inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 px-3 text-primary"
            >
              Editar
            </a>
          </div>
        </div>

        <div *ngIf="ovas.length === 0" class="rounded-xl border-2 border-dashed border-primary/20 bg-primary/5 p-10 text-center space-y-3">
          <p class="font-semibold text-primary">Crea tu primer OVA</p>
          <p class="text-sm text-muted-foreground">
            Describe un tema y la IA generará todo el contenido educativo.
          </p>
          <a routerLink="/crear-ova" class="inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2 mt-2">
            Comenzar ahora
          </a>
        </div>
      </section>

      <section *ngIf="showSharedSection" class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold">OVAs Compartidos con mis alumnos</h2>
          <p class="text-sm text-muted-foreground">
            {{ links.length }} alumno{{ links.length !== 1 ? 's' : '' }} vinculado{{ links.length !== 1 ? 's' : '' }}.
          </p>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div *ngFor="let link of links" class="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <span class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {{ link.linked?.full_name?.[0] || '?' }}
            </span>
            <span class="text-sm font-medium">{{ link.linked?.full_name || 'Alumno vinculado' }}</span>
          </div>
        </div>
        <div class="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Próximamente: estadísticas de consumo por alumno.
        </div>
      </section>

      <div *ngIf="role === 'profesor' && links.length === 0" class="rounded-xl border bg-muted/30 p-6 text-center space-y-2">
        <p class="text-sm font-medium">Vincula alumnos para compartir tus OVAs</p>
        <a routerLink="/vinculacion" class="text-xs font-semibold text-primary hover:underline">
          Ir a Vinculación →
        </a>
      </div>
    </div>
  `,
})
export class DashboardPageComponent implements OnInit, OnDestroy {
  role: string | null = null;
  name: string = "Usuario";
  ovas: OvaItem[] = [];
  links: LinkItem[] = [];
  loading = true;
  private cancelled = false;

  constructor(
    private authService: AuthService,
    private userLinksService: UserLinksService,
  ) {}

  get showSharedSection() {
    return this.role === "profesor" && this.links.length > 0;
  }

  async fetchOvas(params: { page: number; limit: number }): Promise<any> {
    const res = await apiFetch(`/api/ovas?page=${params.page}&limit=${params.limit}`);
    return res.json();
  }

  ngOnInit() {
    this.authService.user$.subscribe((user) => {
      this.role = user?.role ?? null;
      this.name = user?.full_name?.split(" ")[0] ?? "Usuario";
    });

    Promise.all([this.fetchOvas({ page: 1, limit: 5 }), this.userLinksService.fetchMyLinks()])
      .then(([ovaData, linksRes]) => {
        if (this.cancelled) return;
        const items = ovaData?.items ?? ovaData?.ovas ?? [];
        this.ovas = items;
        this.links = (linksRes.links ?? []).filter(
          (l) => l.status === "active" || l.status === "accepted",
        ) as LinkItem[];
      })
      .catch(() => {})
      .finally(() => {
        if (!this.cancelled) this.loading = false;
      });
  }

  ngOnDestroy() {
    this.cancelled = true;
  }

  fmtDate(v?: string) {
    if (!v) return "";
    return new Intl.DateTimeFormat("es-PE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(v));
  }

  getStatusLabel(status?: string) {
    return STATUS_LABEL[status || ""] || "Borrador";
  }

  getStatusCls(status?: string) {
    return STATUS_CLS[status || ""] || "bg-muted text-muted-foreground";
  }
}
