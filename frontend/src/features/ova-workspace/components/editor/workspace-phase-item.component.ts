import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { ConfirmModalComponent } from "@/core/components/confirm-modal.component";
import { IconComponent } from "@/core/components/icon.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import { contentPlainPreview, resourceLabel } from "../../lib/resource-label";
import type { PhaseWithContent } from "../../lib/types";
import { PhaseVersionHistoryComponent } from "../versioning/phase-version-history.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-workspace-phase-item",
  imports: [
    FormsModule,
    ButtonComponent,
    ConfirmModalComponent,
    IconComponent,
    PhaseVersionHistoryComponent,
  ],
  templateUrl: "./workspace-phase-item.component.html",
})
export class WorkspacePhaseItemComponent {
  readonly phase = input.required<PhaseWithContent>();
  readonly isDragging = input(false);
  readonly ovaId = input.required<string>();

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

  historyOpen = false;
  confirmingDelete = false;
  showCode = false;
  mode: "edit" | "regen" | null = null;
  text = "";

  get label(): string {
    return resourceLabel(this.phase());
  }

  get preview(): string {
    return contentPlainPreview(this.phase().content);
  }

  get editorId(): string {
    return `phase-editor-${this.phase().id}`;
  }

  openEdit() {
    this.mode = "edit";
    this.text = this.phase().content || "";
  }

  openRegen() {
    this.mode = "regen";
    this.text = "";
  }

  cancel() {
    this.mode = null;
    this.text = "";
  }

  submit() {
    if (this.mode === "edit") {
      this.onEdit.emit({ phaseId: this.phase().id, content: this.text });
    } else if (this.mode === "regen") {
      this.onRegen.emit({ phaseId: this.phase().id, prompt: this.text });
    }
    this.cancel();
  }

  confirmDelete() {
    this.confirmingDelete = false;
    this.onDelete.emit(this.phase().id);
  }
}
