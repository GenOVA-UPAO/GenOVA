import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import { phaseMeta } from "../../lib/phase-meta";
import { resourceLabel } from "../../lib/resource-label";
import { applyReorder } from "../../lib/resource-reorder";
import type { PhaseWithContent } from "../../lib/types";
import { AddResourceModalComponent } from "../modals/add-resource-modal.component";
import { WorkspacePhaseItemComponent } from "./workspace-phase-item.component";

const MAX_PHASES_PER_TYPE = 4;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-workspace-resource-list",
  imports: [ButtonComponent, IconComponent, WorkspacePhaseItemComponent, AddResourceModalComponent],
  templateUrl: "./workspace-resource-list.component.html",
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

  get phaseLabel(): string {
    return phaseMeta(this.phaseType()).label || this.phaseType();
  }

  get sectionHeadingId(): string {
    return `phase-section-${this.phaseType()}`;
  }

  get isFull() {
    return this.phases().length >= MAX_PHASES_PER_TYPE;
  }

  resourceName(phase: PhaseWithContent): string {
    return resourceLabel(phase);
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
