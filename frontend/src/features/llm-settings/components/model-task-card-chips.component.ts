import { CommonModule } from "@angular/common";
import { Component, input } from "@angular/core";
import {
  chipLabel,
  chipModality,
  lookupModalitySymbol,
  type ChipModel,
} from "../lib/model-task-card.helpers";

@Component({
  selector: "gn-model-task-card-chips",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (!fallbacks()?.length) {
      <div class="flex items-center gap-1.5 text-[10px] italic text-muted-foreground/40">
        <span class="h-1.5 w-1.5 rounded-full bg-muted-foreground/20"></span>
        Sin cadena de respaldo
      </div>
    } @else {
      <div class="flex flex-wrap items-center gap-0.5">
        @for (f of visible; track $index; let i = $index) {
          <span class="inline-flex items-center gap-1">
            @if (i > 0) {
              <span class="text-[8px] text-muted-foreground/30 font-black">→</span>
            }
            <span
              class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border"
              [ngClass]="chip()"
            >
              <span class="text-[9px]" [ngClass]="num()">
                {{ modalitySymbol(f) }}
              </span>
              <span class="truncate max-w-[80px]">{{ label(f) }}</span>
            </span>
          </span>
        }
        @if (overflow > 0) {
          <span
            class="inline-flex items-center rounded-full bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground border border-border/50"
          >
            +{{ overflow }}
          </span>
        }
      </div>
    }
  `,
})
export class ModelTaskCardChipsComponent {
  readonly fallbacks =
    input.required<
      Array<{
        provider: string;
        model_id: string;
      }>
    >();
  readonly models = input.required<ChipModel[]>();
  readonly chip = input.required<string>();
  readonly num = input.required<string>();

  get visible() {
    return (this.fallbacks() ?? []).slice(0, 4);
  }

  get overflow() {
    return Math.max(0, (this.fallbacks()?.length ?? 0) - 4);
  }

  label(f: { provider: string; model_id: string }) {
    return chipLabel(f, this.models());
  }

  modalitySymbol(f: { provider: string; model_id: string }) {
    return lookupModalitySymbol(chipModality(f, this.models()));
  }
}
