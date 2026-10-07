import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { LtiPlatform, LtiPlatformPayload } from "../api/admin-lti.api";
import { errorMessage } from "../lib/error-message";
import {
  useDeleteLtiPlatform,
  useLtiPlatforms,
  useLtiTool,
  useSaveLtiPlatform,
} from "./use-admin-lti";

/** `null`: modal cerrado; `"new"`: alta; una plataforma: edición. */
type Editing = LtiPlatform | "new" | null;

export function useAdminLtiController() {
  const { t } = useTranslation();
  const tool = useLtiTool();
  const platforms = useLtiPlatforms();
  const save = useSaveLtiPlatform();
  const remove = useDeleteLtiPlatform();
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<LtiPlatform | null>(null);

  const closeForm = () => {
    setEditing(null);
    save.reset();
  };

  return {
    tool,
    platforms,
    editing,
    deleting,
    isSaving: save.isPending,
    saveError: save.error === null ? "" : errorMessage(save.error, t("lti:errors.save")),
    isDeleting: remove.isPending,
    openCreate: () => {
      setEditing("new");
    },
    openEdit: (platform: LtiPlatform) => {
      setEditing(platform);
    },
    closeForm,
    submit: (payload: LtiPlatformPayload) => {
      const id = editing !== null && editing !== "new" ? editing.id : null;
      save.mutate({ id, payload }, { onSuccess: closeForm });
    },
    requestDelete: setDeleting,
    cancelDelete: () => {
      setDeleting(null);
    },
    confirmDelete: () => {
      if (deleting === null) return;
      remove.mutate(deleting.id, {
        onSettled: () => {
          setDeleting(null);
        },
      });
    },
  };
}
