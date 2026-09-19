import type { Draft, Entry, TaskDraft } from "./llm-config-draft";

export interface SlotIssue {
  index: number;
  message: string;
}

function entryKey(e: Entry | undefined): string | null {
  if (!e?.provider || !e?.model_id) return null;
  return `${e.provider}::${e.model_id}`;
}

/** Issues on fallback rows only. Empty primary is allowed. */
export function validateTaskChain(task: TaskDraft | undefined): SlotIssue[] {
  if (!task) return [];
  const issues: SlotIssue[] = [];
  const primaryKey = entryKey(task.default);
  const seen = new Set<string>();
  if (primaryKey) seen.add(primaryKey);

  (task.fallbacks ?? []).forEach((f, i) => {
    if (!f.provider || !f.model_id) {
      issues.push({ index: i, message: "Elige un modelo para este fallback." });
      return;
    }
    const key = `${f.provider}::${f.model_id}`;
    if (primaryKey && key === primaryKey) {
      issues.push({ index: i, message: "Este modelo ya es el primario." });
      return;
    }
    if (seen.has(key)) {
      issues.push({ index: i, message: "Este modelo ya está en la cadena." });
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
