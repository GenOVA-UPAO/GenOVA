import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";

@Component({
  selector: "gn-fallback-page",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mx-auto max-w-4xl space-y-6 pb-10 p-8">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="font-display text-3xl font-semibold text-foreground sm:text-4xl flex items-center gap-3">
            Cadena de Fallback
          </h1>
          <p class="mt-1.5 max-w-2xl text-sm font-medium text-muted-foreground">
            (Stub para Fase 5) Orden de prioridad de modelos de IA por cada caso de uso en la plataforma.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class FallbackPageComponent {}
