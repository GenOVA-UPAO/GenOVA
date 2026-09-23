import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import type { SlotIssue } from "../lib/chain-validation";
import { isMediaTask, type TaskDraft } from "../lib/llm-config-draft";
import type { ChipModel } from "../lib/model-task-card.helpers";
import { taskMeta } from "../lib/task-meta";
import type { EnabledModel } from "../lib/user-llm-settings.types";
import { LlmTaskRow } from "./llm-task-row";
import { MediaOffMessage } from "./media-off-message";
import { ModelsReadOnlyTask } from "./models-read-only-task";
import { ModelsTaskHeading } from "./models-task-heading";

// Chips neutros: el color por tarea no aporta significado en la vista de solo lectura.
const NEUTRAL_CHIP = "border-border bg-background text-foreground";
const NEUTRAL_NUM = "text-muted-foreground";

interface ModelsTaskPanelProps {
  task: string;
  hidden: boolean;
  isAdmin: boolean;
  adminSaving: boolean;
  generationOn: boolean;
  selectedDraft: TaskDraft | undefined;
  poolModels: ChipModel[];
  adminModels: ChipModel[];
  issues: SlotIssue[];
  defaults: Record<string, EnabledModel>;
  hasOwnLlmKey: boolean;
  saving: boolean;
  bounds: number[];
  onBack: () => void;
  onToggleGeneration: () => void;
  onChainChange: (next: TaskDraft) => void;
}

export function ModelsTaskPanel(props: Readonly<ModelsTaskPanelProps>) {
  const meta = taskMeta(props.task);
  return (
    <div
      className={cn("min-w-0 space-y-6 p-5 sm:p-6 md:block", props.hidden && "max-md:hidden")}
      role="tabpanel"
      id={`task-panel-${props.task}`}
      aria-labelledby={`task-tab-${props.task}`}
    >
      <button
        type="button"
        className="-ml-1 inline-flex h-11 items-center gap-1 rounded-lg px-1 text-sm font-medium text-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:hidden"
        onClick={props.onBack}
      >
        <Icon name="caret-left" size="text-sm" /> Todas las tareas
      </button>
      <ModelsTaskHeading
        label={meta.label}
        desc={meta.desc}
        task={props.task}
        generationOn={props.generationOn}
        adminSaving={props.adminSaving}
        isAdmin={props.isAdmin}
        onToggleGeneration={props.onToggleGeneration}
      />
      {isMediaTask(props.task) && !props.generationOn ? (
        <MediaOffMessage task={props.task} />
      ) : null}
      {props.isAdmin && props.selectedDraft ? (
        <LlmTaskRow
          task={props.task}
          value={props.selectedDraft}
          models={props.poolModels}
          disabled={props.adminSaving}
          issues={props.issues}
          onChange={props.onChainChange}
        />
      ) : (
        <ModelsReadOnlyTask
          task={props.task}
          draft={props.selectedDraft}
          adminModels={props.adminModels}
          defaults={props.defaults}
          chip={NEUTRAL_CHIP}
          num={NEUTRAL_NUM}
          hasOwnLlmKey={props.hasOwnLlmKey}
          saving={props.saving}
          bounds={props.bounds}
        />
      )}
    </div>
  );
}
