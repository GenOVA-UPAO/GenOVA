import { useTranslation } from "react-i18next";

import { isMediaTask } from "../lib/llm-config-draft";
import { FlagSwitch } from "./flag-switch";
import { TASK_DESCS } from "./llm-task-row.helpers";

interface ModelsTaskHeadingProps {
  label: string;
  desc: string;
  task: string;
  generationOn: boolean;
  adminSaving: boolean;
  isAdmin: boolean;
  onToggleGeneration: () => void;
}

export function ModelsTaskHeading({
  label,
  desc,
  task,
  generationOn,
  adminSaving,
  isAdmin,
  onToggleGeneration,
}: Readonly<ModelsTaskHeadingProps>) {
  const { t } = useTranslation("llm-settings");

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">{label}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{TASK_DESCS[task] ?? desc}</p>
      </div>
      {isMediaTask(task) ? (
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            {generationOn ? t("tasks.enabled") : t("tasks.disabled")}
          </span>
          <FlagSwitch
            size="md"
            checked={generationOn}
            disabled={adminSaving || !isAdmin}
            label={t("tasks.generationOf", { label })}
            onToggle={onToggleGeneration}
          />
        </div>
      ) : null}
    </div>
  );
}
