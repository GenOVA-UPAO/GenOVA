import { Label } from "@/core/components/ui/label";

import type { GuardrailsDraft } from "../lib/guardrails";
import { topicImpact } from "../lib/guardrails";
import { FlagSwitch } from "./flag-switch";

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
    <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-4 border-b border-border/50 bg-muted/20 px-6 py-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">Área temática permitida</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vacío o desactivado = se puede generar sobre
            <span className="font-bold"> cualquier tema</span>. Un área demasiado estrecha puede
            dejar la app sin generar nada.
          </p>
        </div>
        <FlagSwitch checked={draft.topicEnabled} disabled={saving} onToggle={onToggle} />
      </div>
      {draft.topicEnabled ? (
        <div className="space-y-2 px-6 py-4">
          <Label
            className="text-[11px] font-bold tracking-widest text-muted-foreground uppercase"
            htmlFor="guardrail-topic-area"
          >
            Área permitida
          </Label>
          <input
            id="guardrail-topic-area"
            type="text"
            value={draft.topicArea}
            onChange={(event) => {
              onArea(event.target.value);
            }}
            placeholder="p. ej. machine learning y ciencia de datos"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          />
        </div>
      ) : null}
      <div className="border-t border-border/40 bg-muted/10 px-6 py-3">
        <p className={`text-xs ${impact.restricted ? "text-foreground" : "text-amber-700 dark:text-amber-400"}`}>
          {impact.restricted
            ? `AHORA MISMO: solo se permite generar sobre «${impact.area}».`
            : "AHORA MISMO: sin restricción temática — cualquier tema."}
        </p>
      </div>
    </div>
  );
}
