import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { formatContextLength, MODALITY_META } from "../lib/llm-catalog.utils";
import type { CatalogModel } from "../lib/user-llm-settings.types";

const MODALITY_ICONS: Record<string, string> = {
  text: "Aa",
  multimodal: "◆",
  image: "◇",
  audio: "♪",
  embedding: "⬡",
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-model-catalog-row",
  imports: [CommonModule],
  template: `
    <div
      class="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs transition-colors"
      [class.opacity-70]="locked()"
      [class.hover:bg-muted]="!locked()"
    >
      <button
        type="button"
        [disabled]="locked() || saving()"
        (click)="toggle()"
        class="shrink-0 transition rounded p-0.5"
        [class.text-accent-brand]="enabled()"
        [class.text-muted-foreground/30]="!enabled()"
        [attr.aria-label]="enabled() ? 'Quitar de favoritos' : 'Añadir a favoritos'"
      >
        @if (saving()) {
          <span
            class="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-primary"
          ></span>
        } @else {
          {{ enabled() ? "★" : "☆" }}
        }
      </button>
      <span class="flex-1 truncate text-foreground inline-flex items-center gap-1 min-w-0">
        <span class="truncate">{{ model().label || model().model_id }}</span>
        @if (!model().curated) {
          <span class="shrink-0 text-muted-foreground/40" title="No optimizado para OVAs">⚠</span>
        }
        @if (locked()) {
          <span class="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground shrink-0"
            >🔒 sistema</span
          >
        }
      </span>
      <span
        class="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold shrink-0"
        [ngClass]="meta.bg + ' ' + meta.color"
      >
        <span class="opacity-70">{{ modalityIcon }}</span>
        {{ meta.label }}
      </span>
      <span class="text-[10px] text-muted-foreground shrink-0">
        {{ categoryLabel }}
      </span>
      @if (ctx) {
        <span class="text-[10px] text-muted-foreground/70 shrink-0 hidden sm:inline">{{
          ctx
        }}</span>
      }
    </div>
  `,
})
export class ModelCatalogRowComponent {
  readonly model = input.required<CatalogModel>();
  readonly locked = input(false);
  readonly enabled = input(false);
  readonly saving = input(false);
  readonly typeLabels = input<Record<string, string>>({});
  readonly onToggle = output<{
    provider: string;
    modelId: string;
  }>();

  get ctx(): string | null {
    return formatContextLength(this.model().context_length ?? 0);
  }

  get modalityIcon(): string {
    const m = this.model().modality || "text";
    return MODALITY_ICONS[m] || "Aa";
  }

  get meta() {
    const m = this.model().modality || "text";
    return MODALITY_META[m] || MODALITY_META["text"];
  }

  get categoryLabel(): string {
    const key = this.model().category ?? "texto";
    return this.typeLabels()[key] || this.model().category || "texto";
  }

  toggle(): void {
    if (this.locked() || this.saving()) return;
    this.onToggle.emit({ provider: this.model().provider, modelId: this.model().model_id });
  }
}
