import { Label } from "@/core/components/ui/label";
import { Textarea } from "@/core/components/ui/textarea";

import type { GuardrailsDraft } from "../lib/guardrails";
import { normalizeTerms } from "../lib/guardrails";
import type { CatalogModel } from "../lib/user-llm-settings.types";
import { FlagSwitch } from "./flag-switch";
import { LlmModelSelect } from "./llm-model-select";

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
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-border/50 bg-muted/20 px-6 py-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Moderación</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Dos niveles: si eliges un modelo de moderación se usa el modelo; si lo dejas vacío se
            aplica la lista de términos. La lista es el suelo que siempre existe.
          </p>
        </div>
        <FlagSwitch checked={draft.moderationEnabled} disabled={saving} onToggle={onToggle} />
      </div>
      {draft.moderationEnabled ? (
        <div className="space-y-4 px-6 py-4">
          <div className="space-y-2">
            <Label
              className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase"
              htmlFor="guardrail-terms"
            >
              Lista de términos
            </Label>
            <Textarea
              id="guardrail-terms"
              rows={5}
              value={draft.termsText}
              onChange={(event) => {
                onTerms(event.target.value);
              }}
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              {termCount} término(s). Uno por línea; se ignoran líneas vacías y duplicados.
            </p>
          </div>
          <div className="space-y-2">
            <span className="block text-[11px] font-bold tracking-widest text-muted-foreground uppercase">
              Modelo de moderación (opcional)
            </span>
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
      <div className="border-t border-border/40 bg-muted/10 px-6 py-3">
        <p className="text-xs text-muted-foreground">{moderationStatus(draft, termCount)}</p>
      </div>
    </div>
  );
}

function moderationStatus(draft: GuardrailsDraft, termCount: number): string {
  if (!draft.moderationEnabled) return "AHORA MISMO: moderación desactivada — sin moderación activa.";
  if (draft.model.provider && draft.model.modelId) {
    return `AHORA MISMO: moderación activada — se usa el modelo ${draft.model.provider}/${draft.model.modelId}.`;
  }
  return `AHORA MISMO: moderación activada — se aplica la lista de términos (${String(termCount)}).`;
}
