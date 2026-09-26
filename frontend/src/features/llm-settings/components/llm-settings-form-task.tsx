import { Button } from "@/core/components/ui/button";

import { useLlmSettings } from "../hooks/use-llm-settings";
import { TASK_LABELS } from "../lib/llm-settings-labels";
import { LlmSettingsModelSelect } from "./llm-settings-model-select";
import { TimeoutField } from "./timeout-field";

interface LlmSettingsFormTaskProps {
  tipo: string;
  locked: boolean;
}

export function LlmSettingsFormTask({ tipo, locked }: Readonly<LlmSettingsFormTaskProps>) {
  const store = useLlmSettings();
  const cur = store.settings?.[tipo] ?? {};
  const label = TASK_LABELS[tipo] ?? tipo;

  return (
    <li className="space-y-2 py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{label}</span>
        {!locked && cur.override === true ? (
          <Button
            variant="ghost"
            size="xs"
            className="text-muted-foreground"
            disabled={store.saving}
            onClick={() => {
              store.resetTipo(tipo);
            }}
          >
            Usar el de la plataforma
          </Button>
        ) : null}
        {!locked && cur.override !== true ? (
          <span className="text-xs text-muted-foreground">De la plataforma</span>
        ) : null}
      </div>
      <div className="flex items-end gap-2">
        <LlmSettingsModelSelect tipo={tipo} label={label} locked={locked} />
        <TimeoutField
          id={`llm-timeout-${tipo}`}
          taskLabel={label}
          value={cur.timeout_s}
          min={store.bounds[0]}
          max={store.bounds[1]}
          disabled={locked}
          onChange={(seconds) => {
            store.setTipoTimeout(tipo, seconds);
          }}
        />
      </div>
    </li>
  );
}
