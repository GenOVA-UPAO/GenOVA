import { NgClass } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

import type { Resource } from "@/core/lib/ova-types";

import { resourceIconClass } from "../../lib/resource-icons";
import { getResourcePreview } from "../../lib/resource-previews";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-resource-preview-panel",
  imports: [NgClass],
  template: `
    <aside [class]="className()">
      @if (!resource()) {
        <div class="flex flex-col items-center justify-center h-full p-6 text-center gap-3">
          <div
            class="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground/50"
          >
            <i class="ph ph-squares-four text-2xl leading-none" aria-hidden="true"></i>
          </div>
          <p class="text-xs text-muted-foreground leading-relaxed max-w-[14rem]">
            Pasa el cursor o selecciona un recurso para ver qué genera
          </p>
        </div>
      } @else {
        <div class="p-4 border-b border-border shrink-0">
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              [style.backgroundColor]="phaseColor() + '18'"
            >
              <i
                class="text-xl leading-none"
                [ngClass]="previewIconClass()"
                [style.color]="phaseColor()"
                aria-hidden="true"
              ></i>
            </div>
            <div class="min-w-0">
              <p class="font-semibold text-sm text-foreground leading-tight">
                {{ resource()?.tipo }}
              </p>
              <span class="text-xs font-medium text-muted-foreground"
                >Interactividad {{ resource()?.interactividad }}</span
              >
            </div>
          </div>
        </div>

        @if (preview(); as info) {
          <div class="p-4 flex flex-col gap-3 overflow-y-auto">
            <div>
              <p
                class="text-[10px] font-bold uppercase tracking-widest mb-2"
                [style.color]="phaseColor()"
              >
                Qué genera
              </p>
              <ul class="space-y-1.5">
                @for (b of info.bullets; track $index) {
                  <li class="flex items-start gap-2 text-xs text-foreground">
                    <span
                      class="mt-1 h-1.5 w-1.5 rounded-full shrink-0"
                      [style.backgroundColor]="phaseColor()"
                    ></span>
                    {{ b }}
                  </li>
                }
              </ul>
            </div>
            <div class="pt-3 border-t border-border">
              <p class="text-[10px] text-muted-foreground">
                <span class="font-semibold">Formato: </span>{{ info.format }}
              </p>
            </div>
          </div>
        } @else {
          <div class="p-4 text-xs text-muted-foreground">
            Vista previa no disponible para este recurso.
          </div>
        }
      }
    </aside>
  `,
})
export class ResourcePreviewPanelComponent {
  readonly resource = input<Resource | null>(null);
  readonly phaseKey = input("");
  readonly phaseColor = input("#3B82F6");
  readonly className = input(
    "hidden sm:flex flex-col w-72 border-l border-border bg-muted/20 shrink-0 overflow-y-auto",
  );

  readonly previewIconClass = computed(() => resourceIconClass(this.resource()?.tipo));

  readonly preview = computed(() => {
    const resource = this.resource();
    if (!resource) return null;
    return getResourcePreview(this.phaseKey(), resource.id);
  });
}
