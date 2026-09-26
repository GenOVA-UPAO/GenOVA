import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";

import type { GuardrailsDraft } from "../lib/guardrails";
import { normalizeTerms } from "../lib/guardrails";
import { PROVIDER_LABELS } from "../lib/llm-catalog.utils";
import { modelDisplayName } from "../lib/model-name";
import type { CatalogModel } from "../lib/user-llm-settings.types";
import { FlagSwitch } from "./flag-switch";
import { LlmModelSelect } from "./llm-model-select";
import { SettingRow } from "./setting-row";

interface GuardrailsModerationSectionProps {
  draft: GuardrailsDraft;
  saving: boolean;
  models: CatalogModel[];
  onToggle: () => void;
  onTerms: (value: string) => void;
  onModel: (next: { provider: string; modelId: string }) => void;
}

export function GuardrailsModerationSection({
  draft,
  saving,
  models,
  onToggle,
  onTerms,
  onModel,
}: Readonly<GuardrailsModerationSectionProps>) {
  const termCount = normalizeTerms(draft.termsText).length;
  return (
    <SettingRow
      title="Moderación"
      description="Revisa los prompts antes de generar. Si eliges un modelo de moderación se usa ese modelo; si no, se aplica la lista de términos, que siempre actúa como mínimo."
      control={
        <FlagSwitch
          checked={draft.moderationEnabled}
          disabled={saving}
          label="Moderación"
          onToggle={onToggle}
        />
      }
    >
      {draft.moderationEnabled ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guardrail-terms">Lista de términos</Label>
            <Textarea
              id="guardrail-terms"
              rows={5}
              value={draft.termsText}
              aria-describedby="guardrail-terms-help"
              onChange={(event) => {
                onTerms(event.target.value);
              }}
              // Crecía con cada término (27 líneas a la vista): se limita y hace scroll.
              className="max-h-60 font-mono"
            />
            <p id="guardrail-terms-help" className="text-xs text-muted-foreground">
              {termCount === 1 ? "1 término" : `${String(termCount)} términos`}. Uno por línea; se
              ignoran las líneas vacías y los duplicados.
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">Modelo de moderación (opcional)</p>
            <LlmModelSelect
              models={models}
              provider={draft.model.provider || undefined}
              modelId={draft.model.modelId || undefined}
              ariaLabel="Modelo de moderación"
              onChange={onModel}
            />
          </div>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">{moderationStatus(draft, termCount, models)}</p>
    </SettingRow>
  );
}

function moderationStatus(
  draft: GuardrailsDraft,
  termCount: number,
  models: readonly CatalogModel[],
): string {
  if (!draft.moderationEnabled) return "Ahora: la moderación está desactivada.";
  const { provider, modelId } = draft.model;
  if (provider && modelId) {
    // Con su nombre, no con el id y el proveedor en crudo («… (openrouter)»).
    const label = models.find((m) => m.provider === provider && m.model_id === modelId)?.label;
    const name = modelDisplayName(label, modelId);
    return `Ahora: se modera con ${name} (${PROVIDER_LABELS[provider] ?? provider}).`;
  }
  return `Ahora: se aplica la lista de términos (${String(termCount)}).`;
}
