import { useState } from "react";

import type { SlotIssue } from "../lib/chain-validation";
import { joinList } from "../lib/join-list";
import { type Draft, isMediaTask, type TaskDraft } from "../lib/llm-config-draft";
import type { RichModel } from "../lib/model-facts";
import type { ChipModel } from "../lib/model-task-card.helpers";
import { showPendingChangesToast } from "../lib/pending-changes-toast";
import { taskMeta } from "../lib/task-meta";
import { ApplyModelDialog } from "./apply-model-dialog";
import { LlmTaskRow } from "./llm-task-row";

interface AdminTaskEditorProps {
  task: string;
  value: TaskDraft;
  models: RichModel[];
  adminModels: ChipModel[];
  disabled: boolean;
  issues: SlotIssue[];
  draft: Draft | null;
  tasks: string[];
  onChange: (next: TaskDraft) => void;
  onDraftChange?: (next: Draft) => void;
}

/** Cadena de la tarea para el admin, con la opción de copiar el modelo a otras tareas de texto. */
export function AdminTaskEditor({
  task,
  value,
  models,
  adminModels,
  disabled,
  issues,
  draft,
  tasks,
  onChange,
  onDraftChange,
}: Readonly<AdminTaskEditorProps>) {
  const [applyFrom, setApplyFrom] = useState<string | null>(null);
  const canApply = onDraftChange !== undefined && draft !== null && !isMediaTask(task);
  return (
    <>
      <LlmTaskRow
        task={task}
        value={value}
        models={models}
        disabled={disabled}
        issues={issues}
        draft={draft}
        tasks={tasks}
        onChange={onChange}
        onApplyToOthers={
          canApply
            ? () => {
                setApplyFrom(task);
              }
            : undefined
        }
      />
      <ApplyModelDialog
        source={applyFrom}
        draft={draft}
        tasks={tasks}
        models={adminModels}
        onClose={() => {
          setApplyFrom(null);
        }}
        onApply={(next, changed) => {
          onDraftChange?.(next);
          setApplyFrom(null);
          showPendingChangesToast(appliedMessage(changed));
        }}
      />
    </>
  );
}

function appliedMessage(changed: string[]): string {
  const where = joinList(changed.map((t) => taskMeta(t).label));
  return `Modelo copiado a ${where}. Guarda los cambios para usarlo.`;
}
