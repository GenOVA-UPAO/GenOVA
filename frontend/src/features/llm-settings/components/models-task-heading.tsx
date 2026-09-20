import { isMediaTask } from "../lib/llm-config-draft";
import { FlagSwitch } from "./flag-switch";

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
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-display text-lg font-semibold text-foreground">{label}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
      {isMediaTask(task) ? (
        <FlagSwitch
          size="sm"
          checked={generationOn}
          disabled={adminSaving || !isAdmin}
          label={`Generación de ${label}`}
          onToggle={onToggleGeneration}
        />
      ) : null}
    </div>
  );
}
