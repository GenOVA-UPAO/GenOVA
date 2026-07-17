import { ChangeDetectionStrategy, Component, input } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";
import { BadgeComponent } from "@/core/components/ui/badge.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import type { OvaContent, Phase, PhaseSection } from "./ova-five-e-viewer.helpers";
import { phaseColor } from "./ova-five-e-viewer.helpers";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-phase-section",
  imports: [],
  template: `
    @switch (section().type) {
      @case ("heading") {
        <h3 class="mt-5 text-base font-semibold first:mt-0">{{ section().content }}</h3>
      }
      @case ("paragraph") {
        <p class="mt-3 text-sm leading-relaxed text-muted-foreground">{{ section().content }}</p>
      }
      @case ("list") {
        @if (section().ordered) {
          <ol class="mt-3 space-y-1.5 pl-5 text-sm text-muted-foreground list-decimal">
            @for (item of section().items ?? []; track $index) {
              <li class="leading-relaxed">{{ item }}</li>
            }
          </ol>
        } @else {
          <ul class="mt-3 space-y-1.5 pl-5 text-sm text-muted-foreground list-disc">
            @for (item of section().items ?? []; track $index) {
              <li class="leading-relaxed">{{ item }}</li>
            }
          </ul>
        }
      }
      @case ("code") {
        <div class="mt-3 overflow-hidden rounded-lg border border-border">
          @if (section().language) {
            <div
              class="border-b border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground"
            >
              {{ section().language }}
            </div>
          }
          <pre
            class="overflow-x-auto bg-slate-900 p-4 text-xs leading-relaxed text-slate-100"
          ><code>{{ section().content }}</code></pre>
        </div>
      }
      @case ("image") {
        <figure class="mt-3">
          <img
            [src]="section().src"
            [alt]="section().alt ?? ''"
            loading="lazy"
            class="max-w-full rounded-lg border border-border"
          />
          @if (section().alt) {
            <figcaption class="mt-1 text-center text-xs text-muted-foreground">
              {{ section().alt }}
            </figcaption>
          }
        </figure>
      }
    }
  `,
})
export class OvaPhaseSectionComponent {
  readonly section = input.required<PhaseSection>();
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-phase-panel",
  imports: [BadgeComponent, ButtonComponent, IconComponent, OvaPhaseSectionComponent],
  template: `
    <div>
      <div class="flex items-start justify-between gap-4">
        <gn-badge [class]="colors().badge" variant="outline">
          Fase {{ phase().order }} — {{ phase().label }}
        </gn-badge>
        <gn-button
          type="button"
          variant="outline"
          size="sm"
          [disabled]="true"
          class="cursor-not-allowed opacity-60 gap-1.5"
        >
          <gn-icon name="pencil-simple" size="text-sm" /> Editar
        </gn-button>
      </div>
      <div class="mt-4">
        @for (section of phase().sections ?? []; track $index) {
          <gn-ova-phase-section [section]="section" />
        }
      </div>
    </div>
  `,
})
export class OvaPhasePanelComponent {
  readonly phase = input.required<Phase>();
  readonly colors = input.required<{
    tab: string;
    badge: string;
  }>();
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-five-e-viewer",
  imports: [OvaPhasePanelComponent],
  templateUrl: "./ova-five-e-viewer.component.html",
})
export class OvaFiveEViewerComponent {
  readonly content = input<OvaContent | null>(null);
  activeIndex = 0;

  get phases(): Phase[] {
    return this.content()?.phases ?? [];
  }

  get activePhase(): Phase | undefined {
    return this.phases[this.activeIndex];
  }

  colors(phaseId: string) {
    return phaseColor(phaseId);
  }

  selectTab(i: number): void {
    this.activeIndex = i;
  }
}

export type { OvaContent };
