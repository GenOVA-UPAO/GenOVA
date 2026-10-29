import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("llm-settings");
  const termCount = normalizeTerms(draft.termsText).length;
  return (
    <SettingRow
      title={t("guardrails.moderationTitle")}
      description={t("guardrails.moderationDesc")}
      control={
        <FlagSwitch
          checked={draft.moderationEnabled}
          disabled={saving}
          label={t("guardrails.moderationTitle")}
          onToggle={onToggle}
        />
      }
    >
      {draft.moderationEnabled ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guardrail-terms">{t("guardrails.termsList")}</Label>
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
              {t("guardrails.termsCount", { count: termCount })}. {t("guardrails.termsHelp")}
            </p>
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("guardrails.moderationModelOptional")}</p>
            <LlmModelSelect
              models={models}
              provider={draft.model.provider || undefined}
              modelId={draft.model.modelId || undefined}
              ariaLabel={t("guardrails.moderationModel")}
              onChange={onModel}
            />
          </div>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">{moderationStatus(draft, termCount, models, t)}</p>
    </SettingRow>
  );
}

function moderationStatus(
  draft: GuardrailsDraft,
  termCount: number,
  models: readonly CatalogModel[],
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (!draft.moderationEnabled) return t("guardrails.moderationDisabledNow");
  const { provider, modelId } = draft.model;
  if (provider && modelId) {
    // Con su nombre, no con el id y el proveedor en crudo («… (openrouter)»).
    const label = models.find((m) => m.provider === provider && m.model_id === modelId)?.label;
    const name = modelDisplayName(label, modelId);
    return t("guardrails.moderationWithModelNow", { name, provider: PROVIDER_LABELS[provider] ?? provider });
  }
  return t("guardrails.moderationWithTermsNow", { count: termCount });
}

