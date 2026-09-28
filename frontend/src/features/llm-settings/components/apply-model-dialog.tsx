import { Dialog, DialogContent } from "@/core/components/ui/dialog";

import type { Draft } from "../lib/llm-config-draft";
import type { ChipModel } from "../lib/model-task-card.helpers";
import { ApplyModelForm } from "./apply-model-form";

interface ApplyModelDialogProps {
  /** Tarea de la que se copia; `null` = cerrado. */
  source: string | null;
  draft: Draft | null;
  tasks: string[];
  models: ChipModel[];
  onApply: (next: Draft, changed: string[]) => void;
  onClose: () => void;
}

/** Copia el modelo principal (y, si se quiere, los respaldos) a otras tareas de texto, diciendo qué cambia. */
export function ApplyModelDialog({
  source,
  draft,
  tasks,
  models,
  onApply,
  onClose,
}: Readonly<ApplyModelDialogProps>) {
  return (
    <Dialog
      open={source !== null && draft !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="w-[min(34rem,calc(100vw-2rem))] sm:max-w-[34rem]">
        {source && draft ? (
          <ApplyModelForm
            key={source}
            source={source}
            draft={draft}
            tasks={tasks}
            models={models}
            onApply={onApply}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
