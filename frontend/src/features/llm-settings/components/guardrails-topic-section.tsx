import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

import type { GuardrailsDraft } from "../lib/guardrails";
import { topicImpact } from "../lib/guardrails";
import { FlagSwitch } from "./flag-switch";
import { SettingRow } from "./setting-row";

interface GuardrailsTopicSectionProps {
  draft: GuardrailsDraft;
  saving: boolean;
  onToggle: () => void;
  onArea: (value: string) => void;
}

export function GuardrailsTopicSection({
  draft,
  saving,
  onToggle,
  onArea,
}: Readonly<GuardrailsTopicSectionProps>) {
  const impact = topicImpact(draft);
  return (
    <SettingRow
      title="Área temática permitida"
      description="Limita los temas sobre los que se puede generar. Un área demasiado estrecha puede impedir que se genere nada."
      control={
        <FlagSwitch
          checked={draft.topicEnabled}
          disabled={saving}
          label="Área temática permitida"
          onToggle={onToggle}
        />
      }
    >
      {draft.topicEnabled ? (
        <div className="space-y-2">
          <Label htmlFor="guardrail-topic-area">Área permitida</Label>
          <Input
            id="guardrail-topic-area"
            type="text"
            value={draft.topicArea}
            aria-describedby="guardrail-topic-help"
            onChange={(event) => {
              onArea(event.target.value);
            }}
          />
          <p id="guardrail-topic-help" className="text-xs text-muted-foreground">
            Describe el área en pocas palabras, por ejemplo «machine learning y ciencia de datos».
          </p>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {impact.restricted
          ? `Ahora: solo se puede generar sobre «${impact.area}».`
          : "Ahora: sin restricción, se puede generar sobre cualquier tema."}
      </p>
    </SettingRow>
  );
}
