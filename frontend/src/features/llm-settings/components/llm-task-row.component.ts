import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { IconComponent } from "@/app/layout/components/icon.component";

import {
  addFallback,
  type Entry,
  moveFallback,
  removeFallback,
  setFallback,
} from "../lib/llmConfigDraft";
import { LlmModelSelectComponent } from "./llm-model-select.component";
import { getModalitySymbol, TASK_DESCS, TASK_LABELS } from "./llm-task-row.helpers";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-llm-task-row",
  imports: [CommonModule, LlmModelSelectComponent, IconComponent],
  templateUrl: "./llm-task-row.component.html",
})
export class LlmTaskRowComponent {
  readonly task = input.required<string>();
  readonly value = input.required<{
    default?: Entry;
    fallbacks?: Entry[];
  }>();
  readonly models = input.required<
    {
      provider: string;
      model_id: string;
      label?: string;
      modality?: string;
      context_length?: number;
      pricing?: string;
    }[]
  >();
  readonly disabled = input(false);

  readonly onChange = output<{
    default?: Entry;
    fallbacks?: Entry[];
  }>();

  getModalitySymbol = getModalitySymbol;

  get taskLabel(): string {
    return TASK_LABELS[this.task()] ?? this.task();
  }

  get taskDesc(): string {
    return TASK_DESCS[this.task()] ?? "Configuración de modelos de IA";
  }

  get fallbacks(): Entry[] {
    return this.value().fallbacks ?? [];
  }

  getModality(f: Entry): string {
    const fbModel = this.models().find(
      (m) => m.provider === f.provider && m.model_id === f.model_id,
    );
    return fbModel?.modality || "text";
  }

  setDefault(provider: string, modelId: string) {
    this.onChange.emit({
      ...this.value(),
      default: { ...this.value().default, provider, model_id: modelId },
    });
  }

  setFallback(i: number, provider: string, modelId: string) {
    this.onChange.emit({
      ...this.value(),
      fallbacks: setFallback(this.fallbacks, i, provider, modelId),
    });
  }

  addFallback() {
    this.onChange.emit({
      ...this.value(),
      fallbacks: addFallback(this.fallbacks),
    });
  }

  removeFallback(i: number) {
    this.onChange.emit({
      ...this.value(),
      fallbacks: removeFallback(this.fallbacks, i),
    });
  }

  move(i: number, dir: number) {
    this.onChange.emit({
      ...this.value(),
      fallbacks: moveFallback(this.fallbacks, i, dir),
    });
  }
}
