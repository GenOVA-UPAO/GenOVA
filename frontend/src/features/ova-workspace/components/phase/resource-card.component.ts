import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";
import type { Resource } from "@/features/ova-workspace/lib/ova-types";

import { DEFAULT_PHASE_COLOR } from "../../lib/phase-colors";
import { resourceIconClass } from "../../lib/resource-icons";

const INTERACTIVIDAD_COLOR: Record<string, string> = {
  Alta: "bg-primary/10 text-primary",
  Media: "bg-accent-brand/10 text-accent-brand",
  Baja: "bg-muted text-muted-foreground",
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-resource-card",
  imports: [CommonModule, IconComponent],
  template: `
    <button
      type="button"
      (click)="handleClick($event)"
      (mouseenter)="onHover.emit(resource())"
      (mouseleave)="onHover.emit(null)"
      (focus)="onHover.emit(resource())"
      (blur)="onHover.emit(null)"
      [attr.aria-pressed]="selected()"
      [disabled]="disabled()"
      class="text-left w-full rounded-xl border p-4 transition duration-150 cursor-pointer {{
        getBaseClass()
      }}"
      [ngStyle]="getSelectedStyle()"
    >
      <div class="flex items-start gap-3">
        <div
          class="shrink-0 mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg"
          [style.backgroundColor]="phaseColor() + '18'"
        >
          <i
            class="{{ iconClass() }} text-lg leading-none"
            [style.color]="phaseColor()"
            aria-hidden="true"
          ></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-semibold text-foreground text-sm">
              {{ resource().tipo }}
            </span>
            <span
              class="text-xs font-medium px-1.5 py-0.5 rounded-full {{ getInteractividadColor() }}"
            >
              {{ resource().interactividad }}
            </span>
          </div>
          @if (showVideoHint()) {
            <span
              class="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1"
              title="Sin API key de video — generará prompt copiable"
            >
              <gn-icon name="warning" size="text-xs" /> Modo prompt
            </span>
          }
        </div>
        @if (selected()) {
          <span
            class="flex-shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full text-white text-xs font-bold"
            [style.backgroundColor]="phaseColor()"
          >
            @if (selectionIndex(); as idx) {
              {{ idx }}
            } @else {
              <gn-icon name="check" size="text-xs" />
            }
          </span>
        }
        @if (hasConfig()) {
          <button
            type="button"
            (click)="handleConfigClick($event)"
            class="flex-shrink-0 p-1.5 rounded-md hover:bg-muted/60 transition-colors"
            title="Configurar recurso"
            aria-label="Configurar recurso"
          >
            <gn-icon name="gear" size="text-sm" [style.color]="phaseColor()" />
          </button>
        }
      </div>
    </button>
  `,
})
export class ResourceCardComponent {
  readonly resource = input.required<Resource>();
  readonly selected = input(false);
  readonly phaseKey = input("");
  readonly phaseColor = input(DEFAULT_PHASE_COLOR);
  readonly selectionIndex = input<number | null>(null);
  readonly disabled = input(false);
  readonly showVideoHint = input(false);
  readonly hasConfig = input(false);

  readonly onClick = output<Resource>();
  readonly onHover = output<Resource | null>();
  readonly onConfigClick = output<Resource>();

  readonly iconClass = computed(() => resourceIconClass(this.resource().tipo));

  getBaseClass() {
    if (this.disabled()) {
      return "relative border-border bg-muted/40 opacity-50 cursor-not-allowed";
    }
    return "relative border-border bg-card hover:border-primary/30 hover:shadow-md";
  }

  getSelectedStyle() {
    if (this.selected()) {
      return {
        boxShadow: `0 0 0 2px ${this.phaseColor()}`,
        borderColor: `${this.phaseColor()}50`,
        backgroundColor: `${this.phaseColor()}08`,
      };
    }
    return {};
  }

  getInteractividadColor() {
    const inter = this.resource().interactividad || "";
    return INTERACTIVIDAD_COLOR[inter] || INTERACTIVIDAD_COLOR["Baja"];
  }

  handleClick(_e: Event) {
    if (!this.disabled()) {
      this.onClick.emit(this.resource());
    }
  }

  handleConfigClick(e: Event) {
    e.stopPropagation();
    this.onConfigClick.emit(this.resource());
  }
}
