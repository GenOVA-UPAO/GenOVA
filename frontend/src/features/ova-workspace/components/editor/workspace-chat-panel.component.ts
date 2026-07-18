import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { IconComponent } from "@/core/components/icon.component";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { CheckboxComponent } from "@/core/components/ui/checkbox.component";

import type { RegenChatMessage } from "../../lib/regen-chat";
import { resourceLabel as resolveResourceLabel } from "../../lib/resource-label";
import type { Phase } from "../../lib/types";
import { FileChipComponent } from "../shared/file-chip.component";
import type { RegenProgress, UploadsPropBag } from "./workspace-chat-panel.types";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-workspace-chat-panel",
  imports: [FormsModule, ButtonComponent, CheckboxComponent, FileChipComponent, IconComponent],
  templateUrl: "./workspace-chat-panel.component.html",
})
export class WorkspaceChatPanelComponent {
  readonly prompt = input("");
  readonly isRegenerating = input(false);
  readonly uploads = input.required<UploadsPropBag>();
  readonly regenProgress = input.required<RegenProgress>();
  readonly messages = input<RegenChatMessage[]>([]);
  readonly phases = input<Phase[]>([]);
  readonly selectionMode = input(false);
  readonly selectedPhaseIds = input<string[]>([]);

  readonly canRegenAll = input(false);
  readonly canSelectAll = input(false);

  readonly promptChange = output<string>();
  readonly onSubmit = output();
  readonly onRegenAll = output();
  readonly onToggleSelectionMode = output();
  readonly onTogglePhaseSelection = output<string>();
  readonly onSelectAll = output();

  readonly onFilesSelected = output<FileList>();
  readonly onRemoveFile = output<string>();

  get selectedCount() {
    return this.selectedPhaseIds()?.length || 0;
  }

  get allSelected() {
    return this.phases().length > 0 && this.selectedCount === this.phases().length;
  }

  get canUploadMore() {
    return this.uploads().activeUploadsCount < this.uploads().maxUploadFiles;
  }

  get promptPlaceholder() {
    if (this.selectionMode() && this.selectedCount > 0) {
      return `Cambio para ${this.selectedCount} recurso${this.selectedCount !== 1 ? "s" : ""}…`;
    }
    return "Escribe un cambio o mejora para el OVA…";
  }

  handleDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files?.length > 0) {
      this.onFilesSelected.emit(e.dataTransfer.files);
    }
  }

  handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      this.onFilesSelected.emit(input.files);
    }
    input.value = "";
  }

  handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      this.onSubmit.emit();
    }
  }

  resourceLabel(phase: Phase): string {
    return resolveResourceLabel(phase);
  }
}
