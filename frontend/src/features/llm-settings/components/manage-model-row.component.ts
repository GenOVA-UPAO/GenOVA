import { Component, Input, input, output } from "@angular/core";
import type { CatalogModel } from "../lib/user-llm-settings.types";

@Component({
  selector: "gn-manage-model-row",
  standalone: true,
  imports: [],
  template: `
    <div
      class="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors"
      [class.opacity-60]="locked()"
      [class.hover:bg-muted/40]="!locked()"
    >
      <button
        type="button"
        role="switch"
        [attr.aria-checked]="enabled()"
        [disabled]="locked() || saving"
        (click)="handleClick()"
        class="relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        [class.bg-primary]="enabled()"
        [class.bg-input]="!enabled()"
        [class.cursor-not-allowed]="locked()"
        [class.cursor-wait]="saving"
      >
        @if (saving) {
          <span class="absolute inset-0 flex items-center justify-center">
            <span
              class="h-2.5 w-2.5 animate-spin rounded-full border border-white border-t-transparent"
            ></span>
          </span>
        } @else {
          <span
            class="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform duration-200"
            [class.translate-x-4]="enabled()"
            [class.translate-x-0]="!enabled()"
          ></span>
        }
      </button>
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="text-xs font-medium text-foreground truncate">{{
            model.label || model.model_id
          }}</span>
          @if (locked()) {
            <span
              class="shrink-0 text-muted-foreground/50 text-[10px]"
              title="Modelo base del sistema"
              >🔒</span
            >
          }
        </div>
        @if (model.description) {
          <p class="text-[10px] text-muted-foreground/60 truncate mt-0.5">
            {{ model.description }}
          </p>
        }
      </div>
      @if (isFree) {
        <span
          class="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400"
          >Gratis</span
        >
      } @else if (isVariable) {
        <span
          class="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium text-muted-foreground"
          >Variable</span
        >
      } @else if (model.pricing) {
        <span class="text-[10px] text-muted-foreground tabular-nums shrink-0">{{
          pricingShort
        }}</span>
      }
    </div>
  `,
})
export class ManageModelRowComponent {
  @Input({ required: true }) model!: CatalogModel;
  readonly locked = input(false);
  readonly enabled = input(false);
  readonly onToggle = output<{
    provider: string;
    modelId: string;
  }>();

  saving = false;

  get isFree(): boolean {
    return (
      this.model.pricing === "Gratuito" ||
      (!this.model.pricing &&
        (this.model.provider === "groq" || this.model.provider === "huggingface"))
    );
  }

  get isVariable(): boolean {
    return this.model.pricing === "Variable";
  }

  get pricingShort(): string {
    return this.model.pricing?.replace(" por 1M tokens", "") ?? "—";
  }

  async handleClick(): Promise<void> {
    if (this.locked() || this.saving) return;
    this.saving = true;
    try {
      this.onToggle.emit({ provider: this.model.provider, modelId: this.model.model_id });
    } finally {
      this.saving = false;
    }
  }
}
