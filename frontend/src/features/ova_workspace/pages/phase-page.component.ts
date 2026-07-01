import { CommonModule } from "@angular/common";
import { Component, Input, type OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { apiFetch } from "../../../core/lib/http";
import { HtmlPreviewComponent } from "../../student/components/engage/html-preview.component";
import { ResourceCardComponent } from "../../student/components/engage/resource-card.component";
import type { PreviewResult, Resource } from "../../student/lib/types";

@Component({
  selector: "gn-phase-page",
  standalone: true,
  imports: [CommonModule, FormsModule, ResourceCardComponent, HtmlPreviewComponent],
  template: `
    <section class="space-y-6 animate-in fade-in duration-300">
      <header class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-2xl">{{ emoji }}</span>
          <h1 class="text-2xl font-semibold text-foreground">
            Fase {{ phase }}
          </h1>
        </div>
        <p class="text-muted-foreground text-sm">{{ description }}</p>
      </header>

      <div class="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <h2 class="text-base font-semibold text-foreground">
          1. Elige el tipo de recurso
        </h2>
        <div *ngIf="loadingRecursos" class="text-sm text-muted-foreground">Cargando recursos...</div>
        
        <div *ngIf="!loadingRecursos" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          <gn-resource-card
            *ngFor="let r of recursos"
            [resource]="r"
            [selected]="selectedResource?.id === r.id"
            (onClick)="handleSelect($event)"
          ></gn-resource-card>
        </div>
      </div>

      <div class="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <h2 class="text-base font-semibold text-foreground">
          2. Define el concepto
        </h2>
        <div class="flex gap-3 flex-wrap">
          <input
            type="text"
            [(ngModel)]="concept"
            (ngModelChange)="reset()"
            placeholder="Ej: K-Means, Regresión Lineal, Redes Neuronales..."
            class="flex h-10 w-full sm:w-auto sm:min-w-[16rem] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            [disabled]="loading"
          />
          <button
            (click)="generate()"
            [disabled]="!canGenerate"
            class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 w-full sm:w-auto px-5"
          >
            {{ loading ? 'Generando con IA...' : 'Generar recurso' }}
          </button>
        </div>

        <p *ngIf="selectedResource" class="text-xs text-muted-foreground">
          Recurso: <span class="font-medium text-primary">{{ selectedResource.emoji }} {{ selectedResource.tipo }}</span>
        </p>

        <div *ngIf="loading" class="flex items-center gap-3 text-sm text-muted-foreground">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary"></div>
          <span>Llamando a Groq + OpenRouter... esto puede tomar 20-60 segundos.</span>
        </div>

        <div *ngIf="error" class="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
          {{ error }}
        </div>
      </div>

      <div *ngIf="result" class="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
        <h2 class="text-base font-semibold text-foreground">
          3. Vista previa
        </h2>
        <gn-html-preview [result]="result"></gn-html-preview>
      </div>
    </section>
  `,
})
export class PhasePageComponent implements OnInit {
  @Input({ required: true }) phase!: string;
  @Input({ required: true }) emoji!: string;
  @Input({ required: true }) description!: string;

  recursos: Resource[] = [];
  loadingRecursos = true;

  selectedResource: Resource | null = null;
  concept = "";
  loading = false;
  result: PreviewResult | null = null;
  error = "";

  get canGenerate() {
    return this.selectedResource && this.concept.trim().length >= 3 && !this.loading;
  }

  async ngOnInit() {
    try {
      const phaseLower = this.phase.toLowerCase();
      const res = await apiFetch(`/api/ova-workspace/resources/${phaseLower}`);
      const data = await res.json();
      this.recursos = data.recursos || [];
    } catch (_e) {
      this.recursos = [];
    } finally {
      this.loadingRecursos = false;
    }
  }

  handleSelect(r: Resource) {
    this.selectedResource = r;
    this.reset();
  }

  reset() {
    this.result = null;
    this.error = "";
  }

  async generate() {
    if (!this.canGenerate) return;
    this.loading = true;
    this.reset();

    try {
      const phaseLower = this.phase.toLowerCase();
      const res = await apiFetch(`/api/ova-workspace/generate/${phaseLower}`, {
        method: "POST",
        body: JSON.stringify({
          resource_id: this.selectedResource?.id,
          concept: this.concept,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.detail || "Error al generar recurso");
      }
      this.result = data as PreviewResult;
    } catch (e: any) {
      this.error = e.message;
    } finally {
      this.loading = false;
    }
  }
}
