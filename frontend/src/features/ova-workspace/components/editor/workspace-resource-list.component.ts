import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import { applyReorder } from "../../lib/resource-reorder";
import type { PhaseWithContent } from "../../lib/types";
import { AddResourceModalComponent } from "../modals/add-resource-modal.component";
import { WorkspacePhaseItemComponent } from "./workspace-phase-item.component";

const MAX_PHASES_PER_TYPE = 4;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-workspace-resource-list",
  imports: [ButtonComponent, IconComponent, WorkspacePhaseItemComponent, AddResourceModalComponent],
  template: `
    <gn-add-resource-modal
      [open]="addOpen"
      (onOpenChange)="addOpen = $event"
      [phaseType]="phaseType()"
      [currentCount]="phases().length"
      (onAdd)="onAdd.emit($event)"
    ></gn-add-resource-modal>

    <div class="space-y-1">
      <div class="flex items-center justify-between px-1 mb-1">
        <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {{ phaseType() }}
        </p>
        <gn-button
          type="button"
          size="sm"
          variant="ghost"
          class="h-5 text-[10px] px-1.5 text-muted-foreground"
          [disabled]="isFull"
          (click)="addOpen = true"
          [title]="
            isFull ? 'Máximo ' + MAX_PHASES_PER_TYPE + ' recursos por fase' : 'Añadir recurso'
          "
        >
          <gn-icon name="plus" size="text-xs" /> Añadir
        </gn-button>
      </div>

      @for (phase of phases(); track phase.id; let idx = $index) {
        <div
          class="flex items-stretch gap-1 group/reorder"
          draggable="true"
          (dragstart)="handleDragStart($event, idx)"
          (dragover)="handleDragOver($event)"
          (drop)="handleDrop($event, idx)"
          (dragend)="handleDragEnd()"
        >
          <!-- Alternativa de teclado al drag & drop (C7): subir/bajar -->
          <div
            class="flex flex-col justify-center gap-0.5 opacity-0 group-hover/reorder:opacity-100 focus-within:opacity-100 transition-opacity"
          >
            <button
              type="button"
              class="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
              [disabled]="idx === 0"
              (click)="moveByOffset(idx, -1)"
              aria-label="Subir recurso"
            >
              <gn-icon name="caret-up" size="text-xs" />
            </button>
            <button
              type="button"
              class="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30"
              [disabled]="idx === phases().length - 1"
              (click)="moveByOffset(idx, 1)"
              aria-label="Bajar recurso"
            >
              <gn-icon name="caret-down" size="text-xs" />
            </button>
          </div>
          <div class="flex-1 min-w-0">
            <gn-workspace-phase-item
              [phase]="phase"
              [isDragging]="dragIdx === idx"
              [ovaId]="ovaId()"
              (onEdit)="handleEdit($event)"
              (onRegen)="handleRegen($event)"
              (onDelete)="onDelete.emit($event)"
              (onReverted)="onReverted.emit()"
            ></gn-workspace-phase-item>
          </div>
        </div>
      }
    </div>
  `,
})
export class WorkspaceResourceListComponent {
  readonly phases = input<PhaseWithContent[]>([]);
  readonly phaseType = input.required<string>();
  readonly ovaId = input.required<string>();

  readonly onReorder = output<PhaseWithContent[]>();
  readonly onEdit = output<{
    phaseId: string;
    content: string;
  }>();
  readonly onRegen = output<{
    phaseId: string;
    prompt?: string;
  }>();
  readonly onDelete = output<string>();
  readonly onReverted = output();
  readonly onAdd = output<{
    phaseType: string;
    prompt: string;
  }>();

  MAX_PHASES_PER_TYPE = MAX_PHASES_PER_TYPE;
  dragIdx: number | null = null;
  addOpen = false;

  get isFull() {
    return this.phases().length >= MAX_PHASES_PER_TYPE;
  }

  handleDragStart(e: DragEvent, idx: number) {
    this.dragIdx = idx;
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(idx));
    }
  }

  handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
  }

  handleDrop(e: DragEvent, toIdx: number) {
    e.preventDefault();
    const fromIdx = this.dragIdx;
    if (fromIdx === null || fromIdx === toIdx) return;

    this.dragIdx = null;
    this.onReorder.emit(applyReorder(this.phases(), fromIdx, toIdx));
  }

  handleDragEnd() {
    this.dragIdx = null;
  }

  moveByOffset(idx: number, offset: number) {
    const toIdx = idx + offset;
    if (toIdx < 0 || toIdx >= this.phases().length) return;
    this.onReorder.emit(applyReorder(this.phases(), idx, toIdx));
  }

  handleEdit(event: { phaseId: string; content: string }) {
    this.onEdit.emit(event);
  }

  handleRegen(event: { phaseId: string; prompt?: string }) {
    this.onRegen.emit(event);
  }
}
