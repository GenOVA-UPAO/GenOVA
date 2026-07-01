import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { BadgeComponent } from "@/core/components/ui/badge.component";
import { ButtonComponent } from "@/core/components/ui/button.component";
import type { PhaseWithContent } from "../../lib/types";
import { LlmSettingsModalComponent } from "../modals/llm-settings-modal.component";
import { WorkspaceHtmlPreviewComponent } from "./workspace-html-preview.component";
import { WorkspaceResourceListComponent } from "./workspace-resource-list.component";

@Component({
  selector: "gn-workspace-ova-panel",
  standalone: true,
  imports: [
    CommonModule,
    BadgeComponent,
    ButtonComponent,
    WorkspaceHtmlPreviewComponent,
    WorkspaceResourceListComponent,
    LlmSettingsModalComponent,
  ],
  template: `
    <gn-llm-settings-modal
      [open]="settingsOpen"
      (onOpenChange)="settingsOpen = $event"
    ></gn-llm-settings-modal>

    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex items-center gap-2 border-b border-border px-3 py-2 bg-background shrink-0 flex-wrap">
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

        <gn-badge
          *ngIf="versionNumber"
          variant="outline"
          class="text-[10px] text-muted-foreground"
        >
          v{{ versionNumber }}
        </gn-badge>

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
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.6,107.6,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Zm-16.1-6.5a73.93,73.93,0,0,1,0,8.68,8,8,0,0,0,4.74,7.81l21.11,8.88a91.75,91.75,0,0,1-8.36,20.19l-18-13.91a8,8,0,0,0-9.53.7,76.24,76.24,0,0,1-6.13,6.13,8,8,0,0,0-.7,9.53l13.91,18a91.59,91.59,0,0,1-20.19,8.36l-8.88-21.11a8,8,0,0,0-7.81-4.74,73.93,73.93,0,0,1-8.68,0,8,8,0,0,0-7.81,4.74l-8.88,21.11a91.75,91.75,0,0,1-20.19-8.36l13.91-18a8,8,0,0,0,.7-9.53,76.24,76.24,0,0,1-6.13-6.13,8,8,0,0,0-9.53-.7l-18,13.91a91.59,91.59,0,0,1-8.36-20.19l21.11-8.88a8,8,0,0,0,4.74-7.81,73.93,73.93,0,0,1,0-8.68,8,8,0,0,0-4.74-7.81l-21.11-8.88a91.75,91.75,0,0,1,8.36-20.19l18,13.91a8,8,0,0,0,9.53-.7,76.24,76.24,0,0,1,6.13-6.13,8,8,0,0,0,.7-9.53l-13.91-18a91.59,91.59,0,0,1,20.19-8.36l8.88,21.11a8,8,0,0,0,7.81,4.74,73.93,73.93,0,0,1,8.68,0,8,8,0,0,0,7.81-4.74l8.88-21.11a91.75,91.75,0,0,1,20.19,8.36l-13.91,18a8,8,0,0,0-.7,9.53,76.24,76.24,0,0,1,6.13,6.13,8,8,0,0,0,9.53.7l18-13.91a91.59,91.59,0,0,1,8.36,20.19l-21.11,8.88A8,8,0,0,0,199.9,123.66Z"></path></svg>
          </button>
          <gn-button
            type="button"
            size="sm"
            variant="outline"
            [disabled]="!isReady"
            (click)="onDownload.emit()"
            class="h-6 text-xs px-2.5 gap-1"
            [title]="isReady ? 'Descargar SCORM' : 'El OVA debe estar listo para descargar'"
          >
            ⤓ SCORM
          </gn-button>
        </div>
      </div>

      <div [class]="'flex-1 ' + (tab === 'preview' ? 'overflow-hidden' : 'overflow-auto')">
        
        <div *ngIf="isLoading" class="flex h-full items-center justify-center">
          <div class="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary"></div>
        </div>

        <div *ngIf="!isLoading && !hasPhases" class="flex h-full items-center justify-center p-6 text-center">
          <p class="text-sm text-muted-foreground">
            El OVA no tiene contenido aún.
          </p>
        </div>

        <ng-container *ngIf="!isLoading && hasPhases">
          <gn-workspace-html-preview
            *ngIf="tab === 'preview'"
            [phases]="phases"
            (onResourceClick)="onResourceClick.emit($event)"
          ></gn-workspace-html-preview>

          <div *ngIf="tab === 'code'" class="p-4 space-y-4">
            <gn-workspace-resource-list
              *ngFor="let kv of grouped | keyvalue"
              [phaseType]="kv.key"
              [phases]="kv.value"
              [ovaId]="ovaId"
              (onReorder)="handleGroupReorder(kv.key, $event)"
              (onEdit)="onEditPhase.emit($event)"
              (onRegen)="onRegenPhase.emit($event)"
              (onDelete)="onDeletePhase.emit($event)"
              (onReverted)="onPhaseReverted.emit()"
              (onAdd)="onAddPhase.emit($event)"
            ></gn-workspace-resource-list>
          </div>
        </ng-container>

      </div>
    </div>
  `,
})
export class WorkspaceOvaPanelComponent {
  @Input() phases: PhaseWithContent[] = [];
  @Input() versionNumber: number | null = null;
  @Input() isReady = false;
  @Input() isLoading = false;
  @Input() ovaId!: string;

  @Output() onDownload = new EventEmitter<void>();
  @Output() onReorder = new EventEmitter<PhaseWithContent[]>();
  @Output() onEditPhase = new EventEmitter<{ phaseId: string; content: string }>();
  @Output() onRegenPhase = new EventEmitter<{ phaseId: string; prompt?: string }>();
  @Output() onDeletePhase = new EventEmitter<string>();
  @Output() onPhaseReverted = new EventEmitter<void>();
  @Output() onAddPhase = new EventEmitter<{ phaseType: string; prompt: string }>();
  @Output() onResourceClick = new EventEmitter<MouseEvent>();
  @Output() onHistoryOpen = new EventEmitter<void>();

  tab: "preview" | "code" = "preview";
  settingsOpen = false;

  get hasPhases() {
    return Array.isArray(this.phases) && this.phases.length > 0;
  }

  get grouped() {
    if (!this.hasPhases) return {};
    return this.phases.reduce(
      (acc, p) => {
        if (!acc[p.phase_type]) acc[p.phase_type] = [];
        acc[p.phase_type].push(p);
        return acc;
      },
      {} as Record<string, PhaseWithContent[]>,
    );
  }

  handleGroupReorder(phaseType: string, updatedGroup: PhaseWithContent[]) {
    let typeIdx = 0;
    const reordered = this.phases.map((p) =>
      p.phase_type === phaseType ? updatedGroup[typeIdx++] : p,
    );
    this.onReorder.emit(reordered);
  }
}
