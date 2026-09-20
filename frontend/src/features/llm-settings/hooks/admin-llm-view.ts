import { type Draft, type EffectiveConfig, toDraft } from "../lib/llm-config-draft";
import type { ChipModel } from "../lib/model-task-card.helpers";
import type { EnabledModel } from "../lib/user-llm-settings.types";

export const BASE_LLM_TASKS = ["texto", "codigo", "orquestador", "razonamiento"] as const;
export const MEDIA_LLM_TASKS = ["imagen", "video"] as const;

export interface AdminCatalogItem extends ChipModel {
  active?: boolean;
  aptitudes?: string[];
  category?: string;
  context_length?: number;
  pricing?: string;
}

export interface AdminLlmConfigResponse {
  tasks?: string[];
  catalog?: AdminCatalogItem[];
  config?: EffectiveConfig;
}

export function withMediaTasks(tasks: readonly string[]): string[] {
  return [...new Set([...tasks, ...MEDIA_LLM_TASKS])];
}

export function activeCatalog(models: readonly AdminCatalogItem[]): AdminCatalogItem[] {
  return models.filter((model) => model.active !== false);
}

export function draftFromDefaults(
  tasks: readonly string[],
  defaults: Record<string, EnabledModel>,
): Draft {
  const draft: Draft = {};
  for (const task of tasks) {
    if (task === "imagen" || task === "video") continue;
    const fallback = Object.hasOwn(defaults, task) ? defaults[task] : undefined;
    draft[task] = {
      default: fallback
        ? { provider: fallback.provider, model_id: fallback.model_id }
        : { provider: "", model_id: "" },
      fallbacks: [],
    };
  }
  return draft;
}

export function draftFromAdminConfig(
  config: EffectiveConfig | undefined,
  tasks: string[],
): Draft {
  return toDraft(config, tasks);
}
