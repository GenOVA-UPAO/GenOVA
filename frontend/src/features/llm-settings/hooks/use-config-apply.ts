import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type ApplyConfigResponse, restoreConfigVersion } from "../api/model-tools.api";
import { changesSummary } from "../lib/config-history";
import { errorMessage } from "./error-message";
import { modelToolsKeys } from "./model-tools-keys";
import { adminLlmKeys, llmSettingsKeys } from "./query-keys";

/** Cuánto se ve el aviso con «Deshacer»: lo justo para leerlo y arrepentirse. */
const UNDO_TOAST_MS = 10_000;

/**
 * Tras cambiar la config de plataforma (guardar, aplicar un perfil, restaurar):
 * recarga lo que depende de ella y avisa con un «Deshacer» inmediato.
 */
export function useConfigApply() {
  const queryClient = useQueryClient();

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminLlmKeys.config }),
      queryClient.invalidateQueries({ queryKey: modelToolsKeys.all }),
      queryClient.invalidateQueries({ queryKey: llmSettingsKeys.all }),
    ]);
  };

  const undo = async (entryId: string) => {
    try {
      const res = await restoreConfigVersion(entryId, "before");
      await refresh();
      toast.success("Cambio deshecho.", {
        description: res.history_entry ? changesSummary(res.history_entry.changes) : undefined,
      });
    } catch (err: unknown) {
      toast.error(errorMessage(err, "No se pudo deshacer el cambio."));
    }
  };

  /** Aviso de éxito con el resumen de lo que cambió y «Deshacer». */
  const announce = (
    message: string,
    res: Pick<ApplyConfigResponse, "history_entry" | "incomplete">,
  ) => {
    const entry = res.history_entry;
    const incomplete = res.incomplete
      ? " Algún modelo ya no está en el catálogo y esa tarea se quedó con el de siempre."
      : "";
    if (!entry) {
      if (incomplete) toast.success(message, { description: incomplete.trim() });
      else toast.success(message);
      return;
    }
    toast.success(message, {
      description: `${changesSummary(entry.changes)}.${incomplete}`,
      duration: UNDO_TOAST_MS,
      action: {
        label: "Deshacer",
        onClick: () => {
          void undo(entry.id);
        },
      },
    });
  };

  return { refresh, undo, announce };
}
