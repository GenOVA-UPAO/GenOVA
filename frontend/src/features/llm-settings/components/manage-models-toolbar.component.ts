import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";

import type { GroupBy, SortKey } from "../lib/catalog-sort";
import { GROUP_OPTIONS, SORT_OPTIONS } from "../lib/catalog-sort";
import { CATEGORY_LABELS, TYPE_LABELS } from "../lib/llm-settings-labels";

const selectClass =
  "text-xs rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-muted-foreground cursor-pointer";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-manage-models-toolbar",
  imports: [IconComponent],
  template: `
    <div class="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-background">
      <div class="relative flex-1 min-w-[120px]">
        <gn-icon
          name="magnifying-glass"
          size="text-xs"
          class="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
        />
        <input
          type="text"
          placeholder="Buscar modelo..."
          [value]="localSearch()"
          (input)="onSearch.emit($any($event.target).value)"
          class="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-border/60 bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <select
        [value]="typeFilter() || 'all'"
        (change)="onType.emit($any($event.target).value)"
        title="Filtrar por tipo de modelo"
        [class]="selectClass + ' max-w-[130px]'"
      >
        @for (t of types(); track t) {
          <option [value]="t">{{ typeLabels[t] || t }}</option>
        }
      </select>
      <select
        [value]="categoryFilter() || 'all'"
        (change)="onCategory.emit($any($event.target).value)"
        [class]="selectClass"
      >
        @for (cat of categories(); track cat) {
          <option [value]="cat">{{ categoryLabels[cat] || cat }}</option>
        }
      </select>
      <select
        [value]="sortKey()"
        (change)="onSort.emit($any($event.target).value)"
        [class]="selectClass"
        title="Ordenar"
      >
        @for (opt of sortOptions; track opt.key) {
          <option [value]="opt.key">{{ opt.label }}</option>
        }
      </select>
      <select
        [value]="groupBy()"
        (change)="onGroup.emit($any($event.target).value)"
        [class]="selectClass"
        title="Agrupar"
      >
        @for (opt of groupOptions; track opt.key) {
          <option [value]="opt.key">{{ opt.label }}</option>
        }
      </select>
    </div>
  `,
})
export class ManageModelsToolbarComponent {
  readonly localSearch = input("");
  readonly categoryFilter = input("all");
  readonly categories = input<string[]>([]);
  readonly typeFilter = input("all");
  readonly types = input<string[]>([]);
  readonly sortKey = input<SortKey>("default");
  readonly groupBy = input<GroupBy>("provider");

  readonly onSearch = output<string>();
  readonly onCategory = output<string>();
  readonly onType = output<string>();
  readonly onSort = output<SortKey>();
  readonly onGroup = output<GroupBy>();

  categoryLabels = CATEGORY_LABELS;
  typeLabels = TYPE_LABELS;
  sortOptions = SORT_OPTIONS;
  groupOptions = GROUP_OPTIONS;

  /** Copia local para la plantilla: los *select* interpolan una sola vez por CD. */
  selectClass = selectClass;
}
