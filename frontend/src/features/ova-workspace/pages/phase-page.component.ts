import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

@Component({
  selector: "gn-phase-page",
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="space-y-6 p-8">
      <header class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-2xl">{{ emoji }}</span>
          <h1 class="text-2xl font-semibold text-foreground">
            Fase {{ phase }}
          </h1>
        </div>
        <p class="text-muted-foreground text-sm">
          (Stub) {{ description }}
        </p>
      </header>
    </section>
  `,
})
export class PhasePageComponent {
  @Input() phase = "";
  @Input() emoji = "📝";
  @Input() description = "Fase de la metodología 5E";
}
