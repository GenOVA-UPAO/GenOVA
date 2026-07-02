import { Component, Input, input, output } from "@angular/core";

@Component({
  selector: "gn-model-catalog-filter-row",
  standalone: true,
  imports: [],
  template: `
    @if (options.length > 1) {
      <div class="flex items-start gap-3 min-w-0">
        <span
          class="shrink-0 text-[9px] font-black uppercase tracking-[0.16em] text-muted-foreground/40 pt-1.5 min-w-[60px] text-right"
        >
          {{ label() }}
        </span>
        <div class="flex flex-wrap gap-1.5">
          @for (opt of options; track opt) {
            <button
              type="button"
              (click)="onSelect.emit(opt)"
              class="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium border transition duration-150 whitespace-nowrap"
              [class.border-primary]="isActive(opt)"
              [class.bg-primary/8]="isActive(opt)"
              [class.text-primary]="isActive(opt)"
              [class.font-semibold]="isActive(opt)"
              [class.border-border/50]="!isActive(opt)"
              [class.text-muted-foreground/70]="!isActive(opt)"
            >
              {{ labelMap()[opt] || opt }}
            </button>
          }
        </div>
      </div>
    }
  `,
})
export class ModelCatalogFilterRowComponent {
  readonly label = input.required<string>();
  @Input({ required: true }) options: string[] = [];
  readonly active = input("all");
  readonly labelMap = input<Record<string, string>>({});
  readonly onSelect = output<string>();

  isActive(opt: string): boolean {
    const active = this.active();
    return active === opt || (!active && opt === "all");
  }
}
