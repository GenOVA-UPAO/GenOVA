import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";

import type { ChipModel } from "../lib/model-task-card.helpers";
import { taskMeta } from "../lib/task-meta";
import { LlmModelSelectComponent } from "./llm-model-select.component";
import { ModelTaskCardChipsComponent } from "./model-task-card-chips.component";
import { UserOverrideSectionComponent } from "./user-override-section.component";

export interface AdminTaskDraft {
  default?: { provider: string; model_id: string };
  fallbacks?: { provider: string; model_id: string }[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-model-task-card",
  imports: [
    CommonModule,
    LlmModelSelectComponent,
    ModelTaskCardChipsComponent,
    UserOverrideSectionComponent,
    IconComponent,
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
  readonly editChain = output();

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
