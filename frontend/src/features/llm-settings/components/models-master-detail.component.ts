import { CommonModule } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from "@angular/core";

import { ButtonComponent } from "@/core/components/ui/button.component";

import { type Draft, isMediaTask } from "../lib/llmConfigDraft";
import { chipLabel, type ChipModel } from "../lib/model-task-card.helpers";
import { taskMeta } from "../lib/task-meta";
import { modelsForTask } from "../lib/task-model-pool";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { CatalogStatusAlertComponent } from "./catalog-status-alert.component";
import { LlmTaskRowComponent } from "./llm-task-row.component";
import type { AdminTaskDraft } from "./model-task-card.component";
import { ModelTaskCardChipsComponent } from "./model-task-card-chips.component";
import { UserOverrideSectionComponent } from "./user-override-section.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-models-master-detail",
  imports: [
    CommonModule,
    ButtonComponent,
    CatalogStatusAlertComponent,
    LlmTaskRowComponent,
    ModelTaskCardChipsComponent,
    UserOverrideSectionComponent,
  ],
  templateUrl: "./models-master-detail.component.html",
})
export class ModelsMasterDetailComponent {
  readonly tasks = input.required<string[]>();
  readonly draft = input<Draft | null>(null);
  readonly adminModels = input.required<ChipModel[]>();
  readonly isAdmin = input(false);
  readonly adminSaving = input(false);

  readonly draftChange = output<Draft>();
  readonly openCatalog = output();

  store = inject(UserLlmSettingsStore);
  readonly selectedTask = signal("texto");
  readonly mobileShowDetail = signal(false);
  readonly editingChain = signal(false);
  readonly taskMeta = taskMeta;
  readonly isMediaTask = isMediaTask;

  readonly selectedMeta = computed(() => taskMeta(this.selectedTask()));
  readonly selectedDraft = computed(() => this.draft()?.[this.selectedTask()]);

  readonly poolModels = computed(() => {
    const task = this.selectedTask();
    const all = this.adminModels() as (ChipModel & {
      aptitudes?: string[];
      category?: string;
    })[];
    const filtered = modelsForTask(all, task);
    return filtered.length ? filtered : all;
  });

  taskLabel(task: string): string {
    return taskMeta(task).label;
  }

  taskSub(task: string): string {
    const d = this.draft()?.[task]?.default;
    if (d?.provider && d?.model_id) {
      return chipLabel(d, this.adminModels());
    }
    const def = this.store.defaults[task];
    if (def) return chipLabel(def, this.adminModels());
    return "Sin modelo";
  }

  generationOn(task: string): boolean {
    const d = this.draft()?.[task];
    if (typeof d?.generationEnabled === "boolean") return d.generationEnabled;
    return task !== "video";
  }

  selectTask(task: string): void {
    this.selectedTask.set(task);
    this.editingChain.set(false);
    this.mobileShowDetail.set(true);
  }

  backToList(): void {
    this.mobileShowDetail.set(false);
  }

  onChainChange(next: AdminTaskDraft): void {
    const draft = this.draft();
    if (!draft) return;
    const prev = draft[this.selectedTask()] ?? {
      default: { provider: "", model_id: "" },
      fallbacks: [],
    };
    this.draftChange.emit({
      ...draft,
      [this.selectedTask()]: { ...prev, ...next },
    });
  }

  toggleGeneration(): void {
    const draft = this.draft();
    const task = this.selectedTask();
    if (!draft || !isMediaTask(task)) return;
    const prev = draft[task] ?? {
      default: { provider: "", model_id: "" },
      fallbacks: [],
      generationEnabled: task !== "video",
    };
    this.draftChange.emit({
      ...draft,
      [task]: { ...prev, generationEnabled: !this.generationOn(task) },
    });
  }

  toggleEditChain(): void {
    this.editingChain.update((v) => !v);
  }
}
