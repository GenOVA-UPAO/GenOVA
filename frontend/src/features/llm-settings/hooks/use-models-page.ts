import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { useCurrentUser, useIsAdmin } from "@/core/auth/auth-store";

import { draftHasIssues, validateDraft } from "../lib/chain-validation";
import type { Draft } from "../lib/llm-config-draft";
import { openKeyRow } from "../lib/open-key-row";
import { canAccessModels } from "./can-access-models";
import { errorMessage } from "./error-message";
import { connectedProviders, favoritesLabel, headerStatusText } from "./header-status";
import { useAdminLlmDraft } from "./use-admin-llm-draft";
import { useLlmSettingsStore } from "./use-llm-settings-store";

export function useModelsPage() {
  const user = useCurrentUser();
  const isAdmin = useIsAdmin();
  const navigate = useNavigate();
  const store = useLlmSettingsStore();
  const admin = useAdminLlmDraft(store, isAdmin);
  const [activeTab, setActiveTab] = useState("models");
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    if (user && !canAccessModels(user)) {
      void navigate("/dashboard", { replace: true });
    }
  }, [user, navigate]);

  const { ok, total } = connectedProviders(store.catalogStatus);
  const chainInvalid = draftHasIssues(admin.draft, admin.tasks);
  const dirty = store.dirty || admin.adminDirty;

  return {
    store,
    isAdmin,
    blocked: Boolean(user && !canAccessModels(user)),
    headerStatus: headerStatusText(ok, total, favoritesLabel(store.enabledModels.length)),
    activeTab,
    setActiveTab,
    manageOpen,
    setManageOpen,
    admin,
    taskIssues: validateDraft(admin.draft, admin.tasks),
    chainInvalid,
    dirty,
    onDraftChange: (next: Draft) => {
      admin.setDraft(next);
    },
    goToApiKeys: (provider?: string) => {
      setManageOpen(false);
      setActiveTab("credentials");
      if (provider) openKeyRow(provider);
    },
    discard: () => {
      admin.discard();
      store.discard();
    },
    saveAll: () => saveAllChanges(chainInvalid, admin, store),
  };
}

async function saveAllChanges(
  chainInvalid: boolean,
  admin: ReturnType<typeof useAdminLlmDraft>,
  store: ReturnType<typeof useLlmSettingsStore>,
): Promise<void> {
  if (chainInvalid) return;
  try {
    if (admin.adminDirty) await admin.save();
    if (store.dirty) await store.save();
    toast.success("Cambios guardados.");
  } catch (err) {
    toast.error(errorMessage(err, "No se pudo guardar."));
  }
}
