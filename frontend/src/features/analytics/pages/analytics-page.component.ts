import { ChangeDetectionStrategy, Component, inject, type OnInit } from "@angular/core";
import { Router } from "@angular/router";

import {
  StatCardsComponent,
  StatusBreakdownComponent,
} from "../components/analytics-cards.component";
import { RecentOvasComponent, TopCreatorsComponent } from "../components/analytics-lists.component";
import type { AnalyticsData } from "../lib/types";
import { AnalyticsService } from "../services/analytics.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-analytics-page",
  imports: [
    StatCardsComponent,
    StatusBreakdownComponent,
    TopCreatorsComponent,
    RecentOvasComponent,
  ],
  template: `
    <div class="mx-auto max-w-4xl space-y-6 pb-12 animate-in fade-in duration-300">
      <header class="space-y-1">
        <h1 class="font-display text-2xl font-bold">Analítica de aprendizaje</h1>
        <p class="text-sm text-muted-foreground">
          {{ isLoading ? "Cargando métricas…" : "Métricas de " + scopeLabel + "." }}
        </p>
      </header>

      @if (isLoading) {
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
          @for (i of [0, 1, 2]; track i) {
            <div class="h-24 animate-pulse rounded-2xl bg-muted/50"></div>
          }
        </div>
      }

      @if (!isLoading && error) {
        <div
          class="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive"
        >
          No se pudieron cargar las analíticas. Intenta de nuevo más tarde.
        </div>
      }

      @if (!isLoading && !error && data) {
        <gn-stat-cards [totals]="data.totals" [scope]="data.scope"></gn-stat-cards>
        <div class="grid gap-4 md:grid-cols-2">
          <gn-status-breakdown [byStatus]="data.ova_by_status"></gn-status-breakdown>
          <gn-top-creators [creators]="data.top_creators"></gn-top-creators>
        </div>
        <gn-recent-ovas [ovas]="data.recent_ovas"></gn-recent-ovas>
      }
    </div>
  `,
})
export class AnalyticsPageComponent implements OnInit {
  data: AnalyticsData | null = null;
  isLoading = true;
  error: any = null;

  private analyticsService = inject(AnalyticsService);
  private router = inject(Router);

  get scopeLabel() {
    return this.data?.scope === "platform" ? "toda la plataforma" : "tus alumnos vinculados";
  }

  async ngOnInit() {
    try {
      this.data = await this.analyticsService.getAnalytics();
    } catch (err: any) {
      if (err.code === "forbidden") {
        void this.router.navigate(["/dashboard"], { replaceUrl: true });
        return;
      }
      this.error = err;
    } finally {
      this.isLoading = false;
    }
  }
}
