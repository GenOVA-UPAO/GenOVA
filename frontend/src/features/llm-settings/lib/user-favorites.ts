import type { SettingsMap } from "./llm-settings-mutations";
import { taskMeta } from "./task-meta";
import type { EnabledModel } from "./user-llm-settings.types";

/**
 * Con clave propia, el backend solo respeta los modelos de un proveedor que el
 * usuario tiene en favoritos (si tiene alguno de ese proveedor). Para que
 * «favoritos» sea solo «salen primero», lo que el usuario elige se añade solo.
 */

interface UsedModel extends EnabledModel {
  task: string;
}

/** Modelos propios en uso (principal y respaldos de las tareas con elección propia). */
export function userModelsInUse(settings: SettingsMap | null | undefined): UsedModel[] {
  const used: UsedModel[] = [];
  for (const [task, setting] of Object.entries(settings ?? {})) {
    if (setting.override !== true) continue;
    if (setting.provider && setting.model_id) {
      used.push({ task, provider: setting.provider, model_id: setting.model_id });
    }
    for (const entry of setting.fallbacks ?? []) {
      if (entry.provider && entry.model_id)
        used.push({ task, provider: entry.provider, model_id: entry.model_id });
    }
  }
  return used;
}

const same = (a: EnabledModel, b: EnabledModel) =>
  a.provider === b.provider && a.model_id === b.model_id;

/**
 * Favoritos que hay que añadir al elegir `picked`: el elegido y los demás en uso
 * de su proveedor. Si no, al tener el primer favorito de ese proveedor, los que
 * ya se usaban dejarían de valer sin avisar.
 */
export function favoritesToAdd(
  enabled: readonly EnabledModel[],
  picked: EnabledModel,
  inUse: readonly EnabledModel[],
): EnabledModel[] {
  if (!picked.provider || !picked.model_id) return [];
  const wanted = [picked, ...inUse.filter((model) => model.provider === picked.provider)];
  const out: EnabledModel[] = [];
  for (const model of wanted) {
    if (enabled.some((item) => same(item, model)) || out.some((item) => same(item, model)))
      continue;
    out.push({ provider: model.provider, model_id: model.model_id });
  }
  return out;
}

/** Tarea que usa el modelo (si la hay): quitarlo de favoritos la dejaría sin él. */
export function favoriteInUseBy(
  settings: SettingsMap | null | undefined,
  model: EnabledModel,
): string | null {
  const used = userModelsInUse(settings).find((item) => same(item, model));
  return used ? taskMeta(used.task).label : null;
}
