import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input, signal } from "@angular/core";

import { BadgeComponent } from "@/core/components/ui/badge.component";
import { HtmlPreviewFrameComponent } from "@/features/ova-workspace/components/shared/html-preview-frame.component";

import { humanizeResourceType } from "../../lib/ova-job-view-model";
import { DEFAULT_PHASE_META, phaseMeta } from "../../lib/phase-meta";
import type { PhaseWithContent } from "../../lib/types";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-workspace-html-preview",
  imports: [CommonModule, BadgeComponent, HtmlPreviewFrameComponent],
  template: `
    <section role="presentation" class="flex flex-col h-full">
      @if (phases.length) {
        <nav
          aria-label="Recursos del OVA"
          class="flex flex-wrap gap-1 border-b border-border bg-muted/20 px-3 py-2 shrink-0"
        >
          @for (p of phases; track p) {
            <button
              type="button"
              (click)="setActiveId(p.id)"
              class="rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              [ngClass]="getTabClass(p)"
            >
              {{ getLabel(p) }}
            </button>
          }
        </nav>
      }

      @if (phases.length) {
        <div class="flex-1 overflow-hidden">
          <gn-html-preview-frame
            [html]="activePhase()?.content ?? ''"
            class="block h-full"
            className="w-full h-full border-0 block"
            height=""
            [title]="activePhase()?.title ?? 'Vista previa del recurso'"
          ></gn-html-preview-frame>
        </div>
      }

      @if (activePhase()) {
        <div
          class="shrink-0 border-t border-border px-3 py-1 bg-muted/20 flex items-center gap-2 min-w-0"
        >
          <gn-badge variant="outline" class="text-[10px] shrink-0" [ngClass]="activeMeta().badge">
            {{ activeMeta().label ?? activePhase()!.phase_type }}
          </gn-badge>
          @if (activePhase()!.title) {
            <span class="text-xs text-muted-foreground truncate">
              {{ activePhase()!.title }}
            </span>
          }
          @if (activePhase()!.regenerated) {
            <span class="ml-auto text-[10px] text-muted-foreground shrink-0"> ✦ regenerado </span>
          }
        </div>
      }
    </section>
  `,
})
export class WorkspaceHtmlPreviewComponent {
  @Input() phases: PhaseWithContent[] = [];

  activeId = signal<string | null>(null);

  get activePhase(): () => PhaseWithContent | null {
    return () => {
      if (this.phases.length === 0) return null;
      const targetId = this.activeId();
      if (targetId) {
        return this.phases.find((p) => p.id === targetId) || this.phases[0];
      }
      return this.phases[0];
    };
  }

  get activeMeta() {
    return () => {
      const p = this.activePhase();
      return p ? phaseMeta(p.phase_type) : DEFAULT_PHASE_META;
    };
  }

  setActiveId(id: string) {
    this.activeId.set(id);
  }

  getTabClass(p: PhaseWithContent): string {
    const isActive = p.id === this.activePhase()?.id;
    const meta = phaseMeta(p.phase_type);
    if (isActive) return meta.tab;
    return "bg-background text-muted-foreground border border-border hover:bg-muted/60";
  }

  /**
   * WS-02/CR-01: sin título propio, dos recursos de la misma fase colapsaban
   * en la misma pestaña ("Enganche", "Enganche"). Prioriza el título; si
   * falta, compone fase + tipo humanizado y, si aun así se repite, sufija
   * "(2)", "(3)" para mantener las pestañas distinguibles.
   */
  private get labelsById(): Map<string, string> {
    const seen = new Map<string, number>();
    const result = new Map<string, string>();
    for (const p of this.phases) {
      const base = this.baseLabel(p);
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      result.set(p.id, count > 1 ? `${base} (${count})` : base);
    }
    return result;
  }

  private baseLabel(p: PhaseWithContent): string {
    const title = p.title?.trim();
    if (title) return title;
    const meta = phaseMeta(p.phase_type);
    const type = humanizeResourceType(p["resource_type"] as string | number | undefined);
    return type ? `${meta.label} — ${type}` : meta.label || p.phase_type;
  }

  getLabel(p: PhaseWithContent): string {
    return this.labelsById.get(p.id) ?? p.phase_type;
  }
}
