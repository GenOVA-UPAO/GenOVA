import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import { ButtonComponent } from "@/core/components/ui/button.component";
import { applyReorder } from "../../lib/resource-reorder";
import type { PhaseWithContent } from "../../lib/types";
import { AddResourceModalComponent } from "../modals/add-resource-modal.component";
import { WorkspacePhaseItemComponent } from "./workspace-phase-item.component";

const MAX_PHASES_PER_TYPE = 4;

@Component({
  selector: "gn-workspace-resource-list",
  standalone: true,
  imports: [CommonModule, ButtonComponent, WorkspacePhaseItemComponent, AddResourceModalComponent],
  template: `
    <gn-add-resource-modal
      [open]="addOpen"
      (onOpenChange)="addOpen = $event"
      [phaseType]="phaseType"
      [currentCount]="phases.length"
      (onAdd)="onAdd.emit($event)"
    ></gn-add-resource-modal>

    <div class="space-y-1">
      <div class="flex items-center justify-between px-1 mb-1">
        <p class="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
          {{ phaseType }}
        </p>
        <gn-button
          type="button"
          size="sm"
          variant="ghost"
          class="h-5 text-[10px] px-1.5 text-muted-foreground"
          [disabled]="isFull"
          (click)="addOpen = true"
          [title]="isFull ? 'Máximo ' + MAX_PHASES_PER_TYPE + ' recursos por fase' : 'Añadir recurso'"
        >
          + Añadir
        </gn-button>
      </div>

      <div
        *ngFor="let phase of phases; let idx = index"
        draggable="true"
        (dragstart)="handleDragStart($event, idx)"
        (dragover)="handleDragOver($event)"
        (drop)="handleDrop($event, idx)"
        (dragend)="handleDragEnd()"
      >
        <gn-workspace-phase-item
          [phase]="phase"
          [isDragging]="dragIdx === idx"
          [ovaId]="ovaId"
          (onEdit)="handleEdit($event)"
          (onRegen)="handleRegen($event)"
          (onDelete)="onDelete.emit($event)"
          (onReverted)="onReverted.emit()"
        ></gn-workspace-phase-item>
      </div>
    </div>
  `,
})
export class WorkspaceResourceListComponent {
  @Input() phases: PhaseWithContent[] = [];
  @Input() phaseType!: string;
  @Input() ovaId!: string;

  @Output() onReorder = new EventEmitter<PhaseWithContent[]>();
  @Output() onEdit = new EventEmitter<{ phaseId: string; content: string }>();
  @Output() onRegen = new EventEmitter<{ phaseId: string; prompt?: string }>();
  @Output() onDelete = new EventEmitter<string>();
  @Output() onReverted = new EventEmitter<void>();
  @Output() onAdd = new EventEmitter<{ phaseType: string; prompt: string }>();

  MAX_PHASES_PER_TYPE = MAX_PHASES_PER_TYPE;
  dragIdx: number | null = null;
  addOpen = false;

  get isFull() {
    return this.phases.length >= MAX_PHASES_PER_TYPE;
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
    this.onReorder.emit(applyReorder(this.phases, fromIdx, toIdx));
  }

  handleDragEnd() {
    this.dragIdx = null;
  }

  handleEdit(event: { phaseId: string; content: string }) {
    this.onEdit.emit(event);
  }

  handleRegen(event: { phaseId: string; prompt?: string }) {
    this.onRegen.emit(event);
  }
}
