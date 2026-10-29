import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

import type { ModelProfile } from "../api/model-tools.api";
import { ConfigChangeList } from "./config-change-list";
import { UnsavedNote } from "./profile-unsaved-note";

interface ProfileApplyDialogProps {
  profile: ModelProfile | null;
  dirty: boolean;
  applying: boolean;
  onApply: (profile: ModelProfile) => void;
  onClose: () => void;
}

/**
 * Confirmación de «Aplicar perfil» con lo que cambia, tarea por tarea. Solo se
 * abre para perfiles que cambian algo: el que está en uso no ofrece «Aplicar».
 */
export function ProfileApplyDialog({
  profile,
  dirty,
  applying,
  onApply,
  onClose,
}: Readonly<ProfileApplyDialogProps>) {
  const { t } = useTranslation("llm-settings");
  return (
    <Dialog
      open={profile !== null}
      onOpenChange={(next) => {
        if (!next && !applying) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>{t("profiles.applyTitle", { name: profile?.name })}</DialogTitle>
          <DialogDescription>
            {t("profiles.applyDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <p className="text-sm font-medium">{t("profiles.whatChanges")}</p>
          <ConfigChangeList
            changes={profile?.changes ?? []}
            className="max-h-64 overflow-y-auto rounded-lg border border-border px-3 py-2.5"
          />
        </div>
        {dirty ? <UnsavedNote>{t("profiles.applyDiscardWarning")}</UnsavedNote> : null}
        <DialogFooter>
          <Button variant="outline" className="max-sm:h-11" disabled={applying} onClick={onClose}>
            {t("credentials.cancel")}
          </Button>
          <Button
            className="max-sm:h-11"
            loading={applying}
            onClick={() => {
              if (profile) onApply(profile);
            }}
          >
            {t("profiles.applyAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
