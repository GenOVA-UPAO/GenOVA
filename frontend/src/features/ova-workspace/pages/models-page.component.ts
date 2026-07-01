import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";

@Component({
  selector: "gn-models-page",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mx-auto max-w-5xl space-y-8 pb-12 p-8">
      <div class="relative overflow-hidden rounded-2xl border border-border/60 bg-card px-6 py-5 shadow-sm">
        <div class="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-1">
            <h1 class="font-display text-3xl font-semibold text-foreground tracking-tight sm:text-4xl">
              Modelos de IA
            </h1>
            <p class="text-sm text-muted-foreground font-medium max-w-sm">
              (Stub para Fase 5) Modelo primario, cadena de fallback y API keys por proveedor.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ModelsPageComponent {}
