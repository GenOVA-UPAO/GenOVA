import { t } from "i18next";

import { joinList } from "./join-list";
import type { Draft, Entry, TaskDraft } from "./llm-config-draft";
import { taskMeta } from "./task-meta";

export interface SlotIssue {
  index: number;
  message: string;
  /** `empty`: fila recién añadida sin modelo (pista, no error); `duplicate`: error. */
  kind: "empty" | "duplicate";
}

function entryKey(e: Entry | undefined): string | null {
  if (!e?.provider || !e.model_id) return null;
  return `${e.provider}::${e.model_id}`;
}

/** Issues on fallback rows only. Empty primary is allowed. */
export function validateTaskChain(task: TaskDraft | undefined): SlotIssue[] {
  if (!task) return [];
  const issues: SlotIssue[] = [];
  const primaryKey = entryKey(task.default);
  const seen = new Set<string>();
  if (primaryKey) seen.add(primaryKey);

  task.fallbacks.forEach((f, i) => {
    if (!f.provider || !f.model_id) {
      issues.push({
        index: i,
        message: t("llm-settings:chainValidation.chooseOrRemove"),
        kind: "empty",
      });
      return;
    }
    const key = `${f.provider}::${f.model_id}`;
    if (primaryKey && key === primaryKey) {
      issues.push({
        index: i,
        message: t("llm-settings:chainValidation.alreadyPrimary"),
        kind: "duplicate",
      });
      return;
    }
    if (seen.has(key)) {
      issues.push({
        index: i,
        message: t("llm-settings:chainValidation.alreadyInFallback"),
        kind: "duplicate",
      });
      return;
    }
    seen.add(key);
  });
  return issues;
}

export function validateDraft(
  draft: Draft | null | undefined,
  tasks: readonly string[],
): Record<string, SlotIssue[]> {
  const out: Record<string, SlotIssue[]> = {};
  if (!draft) return out;
  for (const t of tasks) {
    const issues = validateTaskChain(draft[t]);
    if (issues.length) out[t] = issues;
  }
  return out;
}

export function draftHasIssues(draft: Draft | null | undefined, tasks: readonly string[]): boolean {
  return Object.keys(validateDraft(draft, tasks)).length > 0;
}

/**
 * Por qué no se puede guardar, con las tareas afectadas. El mensaje genérico
 * («completa o quita… y evita repetir…») obligaba a revisar tarea por tarea.
 */
export function blockingMessage(issues: Record<string, SlotIssue[]>): string | null {
  const tasks = Object.keys(issues);
  if (tasks.length === 0) return null;
  const all = Object.values(issues).flat();
  const empty = all.some((issue) => issue.kind === "empty");
  const duplicate = all.some((issue) => issue.kind === "duplicate");
  const where = joinList(tasks.map((task) => taskMeta(task).label));
  if (empty && duplicate) {
    return t("llm-settings:chainValidation.blockingBoth", { where });
  }
  if (duplicate) return t("llm-settings:chainValidation.blockingDuplicate", { where });
  return t("llm-settings:chainValidation.blockingEmpty", { where });
}
