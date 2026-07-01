import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import type { SharedOva } from "../lib/types";

@Component({
  selector: "gn-shared-ova-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="group relative flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm transition hover:shadow-md">
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-sm font-semibold leading-tight line-clamp-2">
          {{ ova?.title || 'OVA sin título' }}
        </h3>
        <div class="inline-flex items-center rounded-full border px-2.5 py-0.5 font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 shrink-0 text-[10px]">
          Compartido
        </div>
      </div>

      <p *ngIf="ova?.description" class="text-xs text-muted-foreground line-clamp-3">
        {{ ova?.description }}
      </p>

      <div class="mt-auto flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>Por: {{ ova?.owner_name || 'Profesor' }}</span>
        <span *ngIf="ova?.created_at">· {{ formatDate(ova?.created_at) }}</span>
      </div>
    </div>
  `,
})
export class SharedOvaCardComponent {
  @Input() ova?: SharedOva;

  formatDate(iso?: string) {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("es-PE");
  }
}
