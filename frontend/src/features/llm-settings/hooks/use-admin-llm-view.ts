import type { Draft } from "../lib/llm-config-draft";
import type { CatalogModel, EnabledModel } from "../lib/user-llm-settings.types";
import {
  activeCatalog,
  type AdminCatalogItem,
  type AdminLlmConfigResponse,
  BASE_LLM_TASKS,
  draftFromAdminConfig,
  draftFromDefaults,
  withMediaTasks,
} from "./admin-llm-view";

export interface AdminView {
  tasks: string[];
  models: AdminCatalogItem[];
  draft: Draft | null;
}

interface BuildArgs {
  isAdmin: boolean;
  loading: boolean;
  isError: boolean;
  raw: unknown;
  catalogFull: CatalogModel[];
  defaults: Record<string, EnabledModel>;
}

export function buildAdminView(args: BuildArgs): AdminView {
  const fallbackTasks = withMediaTasks([...BASE_LLM_TASKS]);
  if (args.loading) {
    return { tasks: fallbackTasks, models: [], draft: null };
  }
  if (!args.isAdmin) {
    return {
      tasks: fallbackTasks,
      models: activeCatalog(args.catalogFull),
      draft: draftFromDefaults(fallbackTasks, args.defaults),
    };
  }
  if (args.isError) {
    return { tasks: fallbackTasks, models: [], draft: null };
  }
  return viewFromAdminPayload(args.raw, args.catalogFull);
}

function viewFromAdminPayload(raw: unknown, catalogFull: CatalogModel[]): AdminView {
  const data = asAdminConfig(raw);
  const tasks = withMediaTasks(data.tasks ?? [...BASE_LLM_TASKS]);
  const source = data.catalog?.length ? data.catalog : catalogFull;
  return {
    tasks,
    models: activeCatalog(source),
    draft: draftFromAdminConfig(data.config, tasks),
  };
}

function asAdminConfig(raw: unknown): AdminLlmConfigResponse {
  if (!raw || typeof raw !== "object") return {};
  return raw;
}
