import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject, input } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";

import { formatContextLength, PROVIDER_LABELS } from "../lib/llm-catalog.utils";
import { TASK_VISUAL } from "../lib/llm-settings-labels";
import { UserLlmSettingsStore } from "../services/user-llm-settings.store";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-llm-settings-form",
  imports: [CommonModule, IconComponent],
  templateUrl: "./llm-settings-form.component.html",
})
export class LlmSettingsFormComponent {
  readonly readOnly = input(false);

  store = inject(UserLlmSettingsStore);
  providerLabels = PROVIDER_LABELS;

  get locked(): boolean {
    return this.store.saving() || this.readOnly();
  }

  taskKeys(): string[] {
    return Object.keys(this.store.taskLabels);
  }

  currentValue(tipo: string): string {
    const cur = this.store.settings()?.[tipo];
    return cur?.provider && cur?.model_id ? `${cur.provider}::${cur.model_id}` : "";
  }

  onModelChange(tipo: string, value: string): void {
    const [provider, ...rest] = value.split("::");
    this.store.setModel(tipo, provider, rest.join("::"));
  }

  catalogProviders(): string[] {
    return Object.keys(this.store.catalog());
  }

  catalogModels(
    provider: string,
  ): { model_id: string; label?: string; pricing?: string; context_length?: number }[] {
    const models = this.store.catalog()[provider];
    return Array.isArray(models) ? models : [];
  }

  hasNoCatalog(): boolean {
    return this.catalogProviders().every((p) => this.catalogModels(p).length === 0);
  }

  /** Current model is set but absent from the catalog (failed provider refresh):
   * render it as an extra option so the select shows the real value. */
  currentMissingFromCatalog(tipo: string): boolean {
    const cur = this.store.settings()?.[tipo];
    if (!cur?.provider || !cur?.model_id) return false;
    return !this.catalogModels(cur.provider).some((m) => m.model_id === cur.model_id);
  }

  currentModelLabel(tipo: string): string {
    return this.store.settings()?.[tipo]?.model_id ?? "";
  }

  isProviderDown(provider: string): boolean {
    return this.store.catalogStatus()?.[provider]?.ok === false;
  }

  modelLabel(m: { model_id: string; label?: string }): string {
    return m.label || m.model_id;
  }

  modelMeta(m: { pricing?: string; context_length?: number }): string {
    return [m.pricing, formatContextLength(m.context_length ?? 0)].filter(Boolean).join(" · ");
  }

  visual(tipo: string) {
    return TASK_VISUAL[tipo] ?? { icon: "•", bar: "bg-border", tint: "" };
  }
}
