import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, Input, input, output } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";
import { BadgeComponent } from "@/core/components/ui/badge.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import type { PhaseWithContent } from "../../lib/types";
import { LlmSettingsModalOutletComponent } from "../modals/llm-settings-modal-outlet.component";
import { WorkspaceHtmlPreviewComponent } from "./workspace-html-preview.component";
import { WorkspaceResourceListComponent } from "./workspace-resource-list.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-workspace-ova-panel",
  imports: [
    CommonModule,
    BadgeComponent,
    ButtonComponent,
    WorkspaceHtmlPreviewComponent,
    WorkspaceResourceListComponent,
    LlmSettingsModalOutletComponent,
    IconComponent,
  ],
  template: `
    <gn-llm-settings-modal-outlet
      [open]="settingsOpen"
      (onOpenChange)="settingsOpen = $event"
    ></gn-llm-settings-modal-outlet>

    <div class="flex flex-col h-full overflow-hidden">
      <div
        class="flex items-center gap-2 border-b border-border px-3 py-2 bg-background shrink-0 flex-wrap"
      >
        <div class="flex items-center gap-1.5 rounded-md border border-border bg-muted/30 p-0.5">
          <gn-button
            type="button"
            size="sm"
            [variant]="tab === 'preview' ? 'default' : 'ghost'"
            class="h-6 text-xs px-2.5"
            (click)="tab = 'preview'"
          >
            Preview
          </gn-button>
          <gn-button
            type="button"
            size="sm"
            [variant]="tab === 'code' ? 'default' : 'ghost'"
            class="h-6 text-xs px-2.5"
            (click)="tab = 'code'"
          >
            Code
          </gn-button>
        </div>

        @if (versionNumber) {
          <gn-badge variant="outline" class="text-[10px] text-muted-foreground">
            v{{ versionNumber }}
          </gn-badge>
        }

        <gn-button
          type="button"
          variant="ghost"
          size="sm"
          class="h-6 text-xs px-1.5 text-muted-foreground"
          (click)="onHistoryOpen.emit()"
          title="Historial de versiones"
        >
          ⏱ Historial
        </gn-button>

        <div class="ml-auto flex items-center gap-1">
          <button
            type="button"
            (click)="settingsOpen = true"
            class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-background text-sm font-medium transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
            title="Ajustes de Modelo IA"
            aria-label="Ajustes de Modelo IA"
          >
            <gn-icon name="gear" size="text-base" />
          </button>
          <gn-button
            type="button"
            size="sm"
            variant="outline"
            [disabled]="!isReady()"
            (click)="onDownload.emit()"
            class="h-6 text-xs px-2.5 gap-1"
            [title]="isReady() ? 'Descargar SCORM' : 'El OVA debe estar listo para descargar'"
          >
            ⤓ SCORM
          </gn-button>
        </div>
      </div>

      <div [class]="'flex-1 ' + (tab === 'preview' ? 'overflow-hidden' : 'overflow-auto')">
        @if (isLoading()) {
          <div class="flex h-full items-center justify-center">
            <div
              class="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary"
            ></div>
          </div>
        }

        @if (!isLoading() && !hasPhases) {
          <div class="flex h-full items-center justify-center p-6 text-center">
            <p class="text-sm text-muted-foreground">El OVA no tiene contenido aún.</p>
          </div>
        }

        @if (!isLoading() && hasPhases) {
          @if (tab === "preview") {
            <gn-workspace-html-preview
              [phases]="phases()"
              (onResourceClick)="onResourceClick.emit($event)"
            ></gn-workspace-html-preview>
          }
          @if (tab === "code") {
            <div class="p-4 space-y-4">
              @for (kv of grouped | keyvalue; track kv) {
                <gn-workspace-resource-list
                  [phaseType]="kv.key"
                  [phases]="kv.value"
                  [ovaId]="ovaId()"
                  (onReorder)="handleGroupReorder(kv.key, $event)"
                  (onEdit)="onEditPhase.emit($event)"
                  (onRegen)="onRegenPhase.emit($event)"
                  (onDelete)="onDeletePhase.emit($event)"
                  (onReverted)="onPhaseReverted.emit()"
                  (onAdd)="onAddPhase.emit($event)"
                ></gn-workspace-resource-list>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class WorkspaceOvaPanelComponent {
  readonly phases = input<PhaseWithContent[]>([]);
  @Input() versionNumber: number | null = null;
  readonly isReady = input(false);
  readonly isLoading = input(false);
  readonly ovaId = input.required<string>();

  readonly onDownload = output();
  readonly onReorder = output<PhaseWithContent[]>();
  readonly onEditPhase = output<{
    phaseId: string;
    content: string;
  }>();
  readonly onRegenPhase = output<{
    phaseId: string;
    prompt?: string;
  }>();
  readonly onDeletePhase = output<string>();
  readonly onPhaseReverted = output();
  readonly onAddPhase = output<{
    phaseType: string;
    prompt: string;
  }>();
  readonly onResourceClick = output<MouseEvent>();
  readonly onHistoryOpen = output();

  tab: "preview" | "code" = "preview";
  settingsOpen = false;

  get hasPhases() {
    const phases = this.phases();
    return Array.isArray(phases) && phases.length > 0;
  }

  get grouped() {
    if (!this.hasPhases) return {};
    return this.phases().reduce<Record<string, PhaseWithContent[]>>((acc, p) => {
      if (!acc[p.phase_type]) acc[p.phase_type] = [];
      acc[p.phase_type].push(p);
      return acc;
    }, {});
  }

  handleGroupReorder(phaseType: string, updatedGroup: PhaseWithContent[]) {
    let typeIdx = 0;
    const reordered = this.phases().map((p) =>
      p.phase_type === phaseType ? updatedGroup[typeIdx++] : p,
    );
    this.onReorder.emit(reordered);
  }
}
