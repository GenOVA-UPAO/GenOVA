import { CommonModule } from "@angular/common";
import { Component, input, output } from "@angular/core";
import { LlmModelSelectComponent } from "./llm-model-select.component";
import { ModelTaskCardChipsComponent } from "./model-task-card-chips.component";
import { UserOverrideSectionComponent } from "./user-override-section.component";
import { taskMeta } from "../lib/task-meta";
import type { ChipModel } from "../lib/model-task-card.helpers";

export interface AdminTaskDraft {
  default?: { provider: string; model_id: string };
  fallbacks?: Array<{ provider: string; model_id: string }>;
}

@Component({
  selector: "gn-model-task-card",
  standalone: true,
  imports: [
    CommonModule,
    LlmModelSelectComponent,
    ModelTaskCardChipsComponent,
    UserOverrideSectionComponent,
  ],
  templateUrl: "./model-task-card.component.html",
})
export class ModelTaskCardComponent {
  readonly task = input.required<string>();
  readonly index = input(0);
  readonly adminDraft = input<AdminTaskDraft | undefined>(undefined);
  readonly adminModels = input.required<ChipModel[]>();
  readonly isAdmin = input(false);
  readonly adminDisabled = input(false);
  readonly isEditing = input(false);
  readonly hasOwnLlmKey = input(false);
  readonly userDisabled = input(false);
  readonly bounds = input<number[]>([30, 300]);

  readonly adminChange = output<AdminTaskDraft>();
  readonly editChain = output<void>();

  get meta() {
    return taskMeta(this.task());
  }

  get fallbacks() {
    return this.adminDraft()?.fallbacks ?? [];
  }

  onAdminModelChange(ev: { provider: string; modelId: string }) {
    this.adminChange.emit({
      ...this.adminDraft(),
      default: { provider: ev.provider, model_id: ev.modelId },
    });
  }
}
