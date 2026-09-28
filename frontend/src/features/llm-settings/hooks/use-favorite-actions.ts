import { useContext } from "react";
import { toast } from "sonner";

import { useIsAdmin } from "@/core/auth/auth-store";

import { favoriteInUseBy, favoritesToAdd, userModelsInUse } from "../lib/user-favorites";
import { LlmSettingsContext } from "./use-llm-settings";

/**
 * Acciones de favoritos que respetan cómo los usa el backend: para quien usa su
 * propia clave, quitar un favorito en uso dejaría la tarea sin su modelo, y lo
 * que elige tiene que estar en favoritos para que se use.
 */
export function useFavoriteActions() {
  const store = useContext(LlmSettingsContext);
  const isAdmin = useIsAdmin();

  const toggle = async (provider: string, modelId: string): Promise<void> => {
    if (!store) return;
    if (!isAdmin && store.isModelEnabled(provider, modelId)) {
      const task = favoriteInUseBy(store.settings, { provider, model_id: modelId });
      if (task) {
        toast.error(
          `Lo usas en ${task}. Elige otro modelo para esa tarea antes de quitarlo de favoritos.`,
        );
        return;
      }
    }
    await store.toggleFavorite(provider, modelId);
  };

  /** Tras elegir un modelo propio: que cuente como favorito (y los demás en uso de su proveedor). */
  const keepPicked = (provider: string, modelId: string): void => {
    if (!store?.addFavorites || isAdmin) return;
    const missing = favoritesToAdd(
      store.enabledModels,
      { provider, model_id: modelId },
      userModelsInUse(store.settings),
    );
    if (missing.length > 0) void store.addFavorites(missing);
  };

  return { toggle, keepPicked };
}
