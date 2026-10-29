import { useTranslation } from "react-i18next";

import { cn } from "@/core/lib/cn";

import type { ConfigChange } from "../api/model-tools.api";
import { taskMeta } from "../lib/task-meta";

/**
 * Cambios de configuración, tarea por tarea: «Texto: DeepSeek V4.1 Flash →
 * Claude Haiku 4.5». Lo de antes en gris y lo nuevo en el color del texto.
 */
export function ConfigChangeList({
  changes,
  className,
}: Readonly<{ changes: readonly ConfigChange[]; className?: string }>) {
  const { t } = useTranslation("llm-settings");

  const fieldLabel: Record<ConfigChange["field"], string> = {
    primary: "",
    fallbacks: t("history.fallbacks"),
    generation: t("history.generation"),
  };

  return (
    <ul className={cn("space-y-1.5 text-sm", className)}>
      {changes.map((change) => (
        <li key={`${change.task}-${change.field}`} className="leading-snug">
          <span className="font-medium text-foreground">{taskMeta(change.task).label}</span>
          {fieldLabel[change.field] ? (
            <span className="text-muted-foreground">, {fieldLabel[change.field]}</span>
          ) : null}
          <span className="text-muted-foreground">: </span>
          <span className="break-words text-muted-foreground">{change.before}</span>
          <span aria-hidden="true" className="px-1 text-muted-foreground">
            →
          </span>
          <span className="sr-only"> {t("history.changesTo")} </span>
          <span className="break-words text-foreground">{change.after}</span>
        </li>
      ))}
    </ul>
  );
}
