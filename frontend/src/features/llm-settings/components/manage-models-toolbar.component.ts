import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { IconComponent } from "@/app/layout/components/icon.component";

import { CATEGORY_LABELS } from "../lib/llm-settings-labels";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-manage-models-toolbar",
  imports: [IconComponent],
  template: `
    <div class="flex items-center gap-2 px-4 py-3 border-b border-border/40 bg-background">
      <div class="relative flex-1">
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
        [value]="categoryFilter() || 'all'"
        (change)="onCategory.emit($any($event.target).value)"
        class="text-xs rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 text-muted-foreground cursor-pointer"
      >
        @for (cat of categories(); track cat) {
          <option [value]="cat">{{ categoryLabels[cat] || cat }}</option>
        }
      </select>
    </div>
  `,
})
export class ManageModelsToolbarComponent {
  readonly localSearch = input("");
  readonly categoryFilter = input("all");
  readonly categories = input<string[]>([]);
  readonly onSearch = output<string>();
  readonly onCategory = output<string>();

  categoryLabels = CATEGORY_LABELS;
}
