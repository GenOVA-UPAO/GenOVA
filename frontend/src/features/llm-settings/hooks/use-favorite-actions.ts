import { useContext } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation("llm-settings");
  const store = useContext(LlmSettingsContext);
  const isAdmin = useIsAdmin();

  const toggle = async (provider: string, modelId: string): Promise<void> => {
    if (!store) return;
    const enabled = store.isModelEnabled(provider, modelId);
    if (!isAdmin && enabled) {
      const task = favoriteInUseBy(store.settings, { provider, model_id: modelId });
      if (task) {
        toast.error(t("favorites.inUseError", { task }));
        return;
      }
    }
    // Al marcar el primer favorito de un proveedor, los modelos en uso de ese
    // proveedor dejarían de valer: se añaden junto con el marcado.
    if (!isAdmin && !enabled && store.addFavorites) {
      const picked = { provider, model_id: modelId };
      await store.addFavorites(
        favoritesToAdd(store.enabledModels, picked, userModelsInUse(store.settings)),
      );
      return;
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
