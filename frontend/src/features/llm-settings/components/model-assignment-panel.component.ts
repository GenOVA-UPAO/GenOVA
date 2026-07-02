import { Component, Input, inject, input, output } from "@angular/core";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { CatalogStatusAlertComponent } from "./catalog-status-alert.component";
import { LlmTaskRowComponent } from "./llm-task-row.component";
import { MediaTaskCardComponent } from "./media-task-card.component";
import { ModelTaskCardComponent, type AdminTaskDraft } from "./model-task-card.component";
import type { Draft } from "../lib/llmConfigDraft";
import { TASK_LABELS } from "../lib/llm-settings-labels";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import type { ChipModel } from "../lib/model-task-card.helpers";

@Component({
  selector: "gn-model-assignment-panel",
  standalone: true,
  imports: [
    ButtonComponent,
    CatalogStatusAlertComponent,
    LlmTaskRowComponent,
    MediaTaskCardComponent,
    ModelTaskCardComponent,
  ],
  templateUrl: "./model-assignment-panel.component.html",
})
export class ModelAssignmentPanelComponent {
  readonly tasks = input.required<string[]>();
  @Input() draft: Draft | null = null;
  readonly adminModels = input.required<ChipModel[]>();
  readonly isAdmin = input(false);
  readonly adminSaving = input(false);

  readonly draftChange = output<Draft>();
  readonly openManageModels = output<void>();

  store = inject(UserLlmSettingsStore);
  editTask: string | null = null;
  taskLabels = TASK_LABELS;

  toggleEditTask(task: string) {
    this.editTask = this.editTask === task ? null : task;
  }

  onAdminChange(task: string, next: AdminTaskDraft) {
    if (!this.draft) return;
    this.draftChange.emit({ ...this.draft, [task]: next } as Draft);
  }

  onChainChange(task: string, next: AdminTaskDraft) {
    if (!this.draft) return;
    this.draftChange.emit({ ...this.draft, [task]: next } as Draft);
  }

  isMediaTask(task: string) {
    return task === "imagen" || task === "video";
  }
}
