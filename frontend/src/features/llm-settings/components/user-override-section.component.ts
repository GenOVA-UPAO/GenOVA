import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, input } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";

import {
  chipLabel,
  chipModality,
  type ChipModel,
  lookupModalitySymbol,
} from "../lib/model-task-card.helpers";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";
import { LlmModelSelectComponent } from "./llm-model-select.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-user-override-section",
  imports: [CommonModule, LlmModelSelectComponent, IconComponent],
  templateUrl: "./user-override-section.component.html",
})
export class UserOverrideSectionComponent {
  readonly task = input.required<string>();
  readonly chip = input.required<string>();
  readonly num = input.required<string>();
  readonly userDisabled = input(false);
  readonly bounds = input<number[]>([30, 300]);

  store = inject(UserLlmSettingsStore);

  get userSettings() {
    return this.store.settings()?.[this.task()];
  }

  get userModels(): ChipModel[] {
    return this.store.catalogEnabled();
  }

  get userFallbacks() {
    return this.userSettings?.fallbacks ?? [];
  }

  label(f: { provider: string; model_id: string }) {
    return chipLabel(f, this.userModels);
  }

  modalitySymbol(f: { provider: string; model_id: string }) {
    return lookupModalitySymbol(chipModality(f, this.userModels));
  }

  onUserModel(ev: { provider: string; modelId: string }) {
    this.store.setModel(this.task(), ev.provider, ev.modelId);
  }

  onUserTimeout(ev: Event) {
    const val = Number((ev.target as HTMLInputElement).value);
    if (!Number.isNaN(val)) this.store.setTipoTimeout(this.task(), val);
  }

  onUserFallback(i: number, ev: { provider: string; modelId: string }) {
    this.store.setFallback(this.task(), i, ev.provider, ev.modelId);
  }
}
