import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output, signal } from "@angular/core";
import { HtmlPreviewFrameComponent } from "@/core/components/html-preview-frame.component";
import { BadgeComponent } from "@/core/components/ui/badge.component";
import type { PhaseWithContent } from "../../lib/types";

const PHASE_META: Record<string, { label: string; tab: string; badge: string }> = {
  engage: {
    label: "Enganche",
    tab: "bg-primary text-primary-foreground",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  explore: {
    label: "Exploración",
    tab: "bg-primary/85 text-primary-foreground",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  explain: {
    label: "Explicación",
    tab: "bg-primary/70 text-primary-foreground",
    badge: "bg-primary/10 text-primary border-primary/20",
  },
  elaborate: {
    label: "Elaboración",
    tab: "bg-accent-brand/85 text-primary-foreground",
    badge: "bg-accent-brand/10 text-accent-brand border-accent-brand/25",
  },
  evaluate: {
    label: "Evaluación",
    tab: "bg-accent-brand text-primary-foreground",
    badge: "bg-accent-brand/10 text-accent-brand border-accent-brand/25",
  },
};

const DEFAULT_META = {
  label: null as string | null,
  tab: "bg-muted text-muted-foreground",
  badge: "bg-muted text-muted-foreground border-border",
};

function getMeta(phase_type: string) {
  return PHASE_META[phase_type] ?? { ...DEFAULT_META, label: phase_type };
}

@Component({
  selector: "gn-workspace-html-preview",
  standalone: true,
  imports: [CommonModule, BadgeComponent, HtmlPreviewFrameComponent],
  template: `
    <section class="flex flex-col h-full" (click)="onResourceClick.emit($event)">
      <nav
        *ngIf="phases.length"
        aria-label="Recursos del OVA"
        class="flex flex-wrap gap-1 border-b border-border bg-muted/20 px-3 py-2 shrink-0"
      >
        <button
          *ngFor="let p of phases"
          type="button"
          (click)="$event.stopPropagation(); setActiveId(p.id)"
          class="rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          [ngClass]="getTabClass(p)"
        >
          {{ getLabel(p) }}
        </button>
      </nav>

      <div class="flex-1 overflow-hidden" *ngIf="phases.length">
        <gn-html-preview-frame
          [html]="activePhase()?.content ?? ''"
          class="w-full h-full border-0 block"
          height=""
          [title]="activePhase()?.title ?? 'Vista previa del recurso'"
        ></gn-html-preview-frame>
      </div>

      <div *ngIf="activePhase()" class="shrink-0 border-t border-border px-3 py-1 bg-muted/20 flex items-center gap-2 min-w-0">
        <gn-badge
          variant="outline"
          class="text-[10px] shrink-0"
          [ngClass]="activeMeta().badge"
        >
          {{ activeMeta().label ?? activePhase()!.phase_type }}
        </gn-badge>
        
        <span *ngIf="activePhase()!.title" class="text-xs text-muted-foreground truncate">
          {{ activePhase()!.title }}
        </span>
        
        <span *ngIf="activePhase()!.regenerated" class="ml-auto text-[10px] text-muted-foreground shrink-0">
          ✦ regenerado
        </span>
      </div>
    </section>
  `,
})
export class WorkspaceHtmlPreviewComponent {
  @Input() phases: PhaseWithContent[] = [];
  @Output() onResourceClick = new EventEmitter<MouseEvent>();

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
      const p = this.activePhase()();
      return p ? getMeta(p.phase_type) : DEFAULT_META;
    };
  }

  setActiveId(id: string) {
    this.activeId.set(id);
  }

  getTabClass(p: PhaseWithContent): string {
    const isActive = p.id === this.activePhase()()?.id;
    const meta = getMeta(p.phase_type);
    if (isActive) return meta.tab;
    return "bg-background text-muted-foreground border border-border hover:bg-muted/60";
  }

  getLabel(p: PhaseWithContent): string {
    const meta = getMeta(p.phase_type);
    return p.title ?? meta.label ?? p.phase_type;
  }
}
