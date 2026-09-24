import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";

import { useLlmSettings } from "../hooks/use-llm-settings";
import { TASK_LABELS } from "../lib/llm-settings-labels";
import { LlmSettingsModelSelect } from "./llm-settings-model-select";

interface LlmSettingsFormTaskProps {
  tipo: string;
  locked: boolean;
}

export function LlmSettingsFormTask({ tipo, locked }: Readonly<LlmSettingsFormTaskProps>) {
  const store = useLlmSettings();
  const cur = store.settings?.[tipo] ?? {};
  const label = TASK_LABELS[tipo] ?? tipo;
  const timeoutId = `llm-timeout-${tipo}`;

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
      <div className="flex items-center gap-2">
        <LlmSettingsModelSelect tipo={tipo} label={label} locked={locked} />
        <div className="flex shrink-0 items-center gap-1.5">
          <Input
            id={timeoutId}
            type="number"
            min={store.bounds[0]}
            max={store.bounds[1]}
            value={cur.timeout_s ?? ""}
            disabled={locked}
            aria-label={`Tiempo máximo de espera de ${label}, en segundos`}
            onChange={(event) => {
              store.setTipoTimeout(tipo, Number(event.target.value));
            }}
            className="h-9 w-[4.5rem] px-1.5 text-center tabular-nums max-sm:h-11"
          />
          <span className="text-xs text-muted-foreground" aria-hidden="true">
            s
          </span>
        </div>
      </div>
    </li>
  );
}
