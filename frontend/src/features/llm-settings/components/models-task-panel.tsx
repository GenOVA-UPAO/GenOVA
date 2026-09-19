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
      className={cn("space-y-5 p-5 sm:p-6 md:block", props.hidden && "max-md:hidden")}
      role="tabpanel"
      id={`task-panel-${props.task}`}
      aria-labelledby={`task-tab-${props.task}`}
    >
      <button
        type="button"
        className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-primary md:hidden"
        onClick={props.onBack}
      >
        ← Volver a la lista
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
          chip={meta.chip}
          num={meta.num}
          hasOwnLlmKey={props.hasOwnLlmKey}
          saving={props.saving}
          bounds={props.bounds}
        />
      )}
    </div>
  );
}
