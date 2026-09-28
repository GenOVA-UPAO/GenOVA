import { useState } from "react";

import { Button } from "@/core/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

import { applyTargets, applyToTasks, previewApply } from "../lib/bulk-apply";
import type { Draft, Entry } from "../lib/llm-config-draft";
import { chipLabel, type ChipModel } from "../lib/model-task-card.helpers";
import { ApplyFallbacksOption } from "./apply-fallbacks-option";
import { ApplyModelRow } from "./apply-model-row";

interface ApplyModelFormProps {
  source: string;
  draft: Draft;
  tasks: string[];
  models: ChipModel[];
  onApply: (next: Draft, changed: string[]) => void;
  onClose: () => void;
}

/** Contenido del diálogo: tareas a las que copiar, respaldos y confirmación. */
export function ApplyModelForm({
  source,
  draft,
  tasks,
  models,
  onApply,
  onClose,
}: Readonly<ApplyModelFormProps>) {
  const targets = applyTargets(tasks, source);
  const origin = draft[source];
  const sourceFallbacks = origin.fallbacks.filter((entry) => entry.provider && entry.model_id);
  const [withFallbacks, setWithFallbacks] = useState(false);
  const preview = previewApply(draft, source, targets, withFallbacks);
  // Todas marcadas de salida: las que ya quedan igual se muestran, pero no cuentan.
  const [picked, setPicked] = useState<string[]>(targets);
  const chosen = preview.filter((item) => picked.includes(item.task) && !item.unchanged);
  const name = (entry: Entry) =>
    entry.provider && entry.model_id ? chipLabel(entry, models) : "Sin modelo";
  const modelName = name(origin.default);

  return (
    <>
      <DialogHeader className="pr-8">
        <DialogTitle>Usar {modelName} en otras tareas</DialogTitle>
        <DialogDescription>
          Elige a qué tareas de texto se copia. Nada cambia hasta que pulses «Guardar cambios».
        </DialogDescription>
      </DialogHeader>
      <fieldset className="space-y-2">
        <legend className="sr-only">Tareas</legend>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {preview.map((item) => (
            <ApplyModelRow
              key={item.task}
              item={item}
              checked={picked.includes(item.task)}
              withFallbacks={withFallbacks}
              name={name}
              onToggle={(checked) => {
                setPicked(
                  checked ? [...picked, item.task] : picked.filter((task) => task !== item.task),
                );
              }}
            />
          ))}
        </ul>
      </fieldset>
      {sourceFallbacks.length > 0 ? (
        <ApplyFallbacksOption
          checked={withFallbacks}
          names={sourceFallbacks.map(name)}
          onChange={setWithFallbacks}
        />
      ) : null}
      <DialogFooter>
        {/* En móvil el pie apila los botones al revés: el aviso va el último para quedar encima. */}
        {chosen.length === 0 ? (
          <p className="text-xs text-muted-foreground max-sm:order-last sm:mr-auto sm:self-center">
            Marca al menos una tarea que cambie.
          </p>
        ) : null}
        <Button variant="outline" className="max-sm:h-11" onClick={onClose}>
          Cancelar
        </Button>
        <Button
          className="max-sm:h-11"
          disabled={chosen.length === 0}
          onClick={() => {
            const changed = chosen.map((item) => item.task);
            onApply(applyToTasks(draft, source, changed, withFallbacks), changed);
          }}
        >
          {applyLabel(chosen.length)}
        </Button>
      </DialogFooter>
    </>
  );
}

function applyLabel(count: number): string {
  if (count === 0) return "Aplicar";
  return count === 1 ? "Aplicar a 1 tarea" : `Aplicar a ${String(count)} tareas`;
}
