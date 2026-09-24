import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { useCurrentUser, useIsAdmin } from "@/core/auth/auth-store";

import type { ApplyConfigResponse } from "../api/model-tools.api";
import { connectedProviders } from "../lib/catalog-status";
import { blockingMessage, validateDraft } from "../lib/chain-validation";
import type { Draft } from "../lib/llm-config-draft";
import {
  focusFirstKeyRow,
  focusFirstPlatformKeyRow,
  openKeyRow,
  openPlatformKeyRow,
} from "../lib/open-key-row";
import { canAccessModels } from "./can-access-models";
import { errorMessage } from "./error-message";
import { favoritesLabel, headerStatusText } from "./header-status";
import { useAdminLlmDraft } from "./use-admin-llm-draft";
import { useConfigApply } from "./use-config-apply";
import { useLlmSettingsStore } from "./use-llm-settings-store";

export function useModelsPage() {
  const user = useCurrentUser();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const store = useLlmSettingsStore();
  const admin = useAdminLlmDraft(store, isAdmin);
  const [activeTab, setActiveTab] = useState("models");
  const [manageOpen, setManageOpen] = useState(false);
  const feedback = useConfigApply();

  useEffect(() => {
    if (user && !canAccessModels(user)) {
      void navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const { connected, total } = connectedProviders(store.catalogStatus);
  const taskIssues = validateDraft(admin.draft, admin.tasks);
  const chainMessage = blockingMessage(taskIssues);
  const chainInvalid = chainMessage !== null;
  const dirty = store.dirty || admin.adminDirty;
  const canEdit = isAdmin || store.hasOwnLlmKey;

  return {
    store,
    isAdmin,
    blocked: Boolean(user && !canAccessModels(user)),
    canEdit,
    headerStatus: headerStatus({
      isAdmin,
      hasOwnKey: store.hasOwnLlmKey,
      connected,
      total,
      favorites: store.enabledModels.length,
    }),
    activeTab,
    setActiveTab: (next: string) => {
      // Al volver de Credenciales puede haber una clave nueva: el estado de los
      // proveedores («Sin conectar: …») se vuelve a pedir.
      if (next === "models" && activeTab === "credentials") {
        store.refetch();
      }
      setActiveTab(next);
    },
    manageOpen,
    setManageOpen,
    admin,
    taskIssues,
    chainMessage,
    dirty,
    onDraftChange: (next: Draft) => {
      admin.setDraft(next);
    },
    goToApiKeys: (provider?: string) => {
      setManageOpen(false);
      setActiveTab("credentials");
      // El admin conecta proveedores con las claves de la plataforma, no con las suyas.
      if (provider) {
        if (isAdmin) openPlatformKeyRow(provider);
        else openKeyRow(provider);
      } else if (isAdmin) focusFirstPlatformKeyRow();
      else focusFirstKeyRow();
    },
    goToPlatformKey: (provider: string) => {
      setActiveTab("credentials");
      openPlatformKeyRow(provider);
    },
    discard: () => {
      admin.discard();
      store.discard();
    },
    saveAll: () => saveAllChanges(chainInvalid, admin, store, feedback.announce),
  };
}

async function saveAllChanges(
  chainInvalid: boolean,
  admin: ReturnType<typeof useAdminLlmDraft>,
  store: ReturnType<typeof useLlmSettingsStore>,
  announce: ReturnType<typeof useConfigApply>["announce"],
): Promise<void> {
  if (chainInvalid) return;
  try {
    const adminRes = admin.adminDirty ? await admin.save() : null;
    if (store.dirty) await store.save();
    // Con la config de plataforma, el aviso dice qué cambió y ofrece «Deshacer».
    announce("Cambios guardados.", historyOf(adminRes));
  } catch (err) {
    toast.error(errorMessage(err, "No se pudo guardar."));
  }
}

function historyOf(res: unknown): Pick<ApplyConfigResponse, "history_entry"> {
  if (res && typeof res === "object" && "history_entry" in res) {
    return { history_entry: (res as ApplyConfigResponse).history_entry };
  }
  return { history_entry: null };
}

/**
 * Los proveedores conectados son cosa de la plataforma (admin). A un docente
 * solo le sirve saber cuántos modelos tiene activados, y solo si tiene clave.
 */
function headerStatus({
  isAdmin,
  hasOwnKey,
  connected,
  total,
  favorites,
}: {
  isAdmin: boolean;
  hasOwnKey: boolean;
  connected: number;
  total: number;
  favorites: number;
}): string | undefined {
  if (isAdmin) return headerStatusText(connected, total, favoritesLabel(favorites));
  return hasOwnKey ? favoritesLabel(favorites) : undefined;
}
