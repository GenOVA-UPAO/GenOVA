import { cn } from "@/core/lib/cn";

import type { ConfigChange } from "../api/model-tools.api";
import { taskMeta } from "../lib/task-meta";

const FIELD_LABEL: Record<ConfigChange["field"], string> = {
  primary: "",
  fallbacks: "respaldos",
  generation: "generación",
};

/**
 * Cambios de configuración, tarea por tarea: «Texto: DeepSeek V4.1 Flash →
 * Claude Haiku 4.5». Lo de antes en gris y lo nuevo en el color del texto.
 */
export function ConfigChangeList({
  changes,
  className,
}: Readonly<{ changes: readonly ConfigChange[]; className?: string }>) {
  return (
    <ul className={cn("space-y-1.5 text-sm", className)}>
      {changes.map((change) => (
        <li key={`${change.task}-${change.field}`} className="leading-snug">
          <span className="font-medium text-foreground">{taskMeta(change.task).label}</span>
          {FIELD_LABEL[change.field] ? (
            <span className="text-muted-foreground">, {FIELD_LABEL[change.field]}</span>
          ) : null}
          <span className="text-muted-foreground">: </span>
          <span className="break-words text-muted-foreground">{change.before}</span>
          <span aria-hidden="true" className="px-1 text-muted-foreground">
            →
          </span>
          <span className="sr-only"> pasa a </span>
          <span className="break-words text-foreground">{change.after}</span>
        </li>
      ))}
    </ul>
  );
}
