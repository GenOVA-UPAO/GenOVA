import { useTranslation } from "react-i18next";

import { ConfirmModal } from "@/core/components/confirm-modal";
import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { errorMessage } from "../hooks/error-message";
import { useProfilesSheet } from "../hooks/use-profiles-sheet";
import { ModelsSideSheet } from "./models-side-sheet";
import { ProfileApplyDialog } from "./profile-apply-dialog";
import { ProfileSaveDialog } from "./profile-save-dialog";
import { ProfilesList } from "./profiles-list";

interface ProfilesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Hay cambios sin guardar en la página. */
  dirty: boolean;
  /** Descarta el borrador antes de cambiar la config desde aquí. */
  onDiscardDraft: () => void;
}

/** Perfiles de modelos: guardar la config actual con un nombre y aplicarla en un clic. */
export function ProfilesSheet({
  open,
  onOpenChange,
  dirty,
  onDiscardDraft,
}: Readonly<ProfilesSheetProps>) {
  const { t } = useTranslation("llm-settings");
  const sheet = useProfilesSheet({ open, onOpenChange, onDiscardDraft });
  const { profiles } = sheet;
  return (
    <>
      <ModelsSideSheet
        open={open}
        onOpenChange={onOpenChange}
        title={t("profiles.title")}
        description={t("profiles.description")}
        action={
          <div className="space-y-1.5">
            <Button className="w-full max-sm:h-11" disabled={sheet.full} onClick={sheet.openSave}>
              <Icon name="plus" size="text-base" />
              {t("profiles.saveCurrent")}
            </Button>
            {sheet.full ? (
              <p className="text-xs text-muted-foreground">
                {t("profiles.maxProfilesCount", { count: profiles.limit })}
              </p>
            ) : null}
          </div>
        }
      >
        <ProfilesList
          profiles={profiles}
          onApply={sheet.setApplying}
          onDelete={sheet.setDeleting}
        />
      </ModelsSideSheet>
      <ProfileSaveDialog
        open={sheet.saveOpen}
        dirty={dirty}
        saving={profiles.create.isPending}
        serverError={profiles.create.error ? errorMessage(profiles.create.error, "") : null}
        onClose={sheet.closeSave}
        onSave={sheet.save}
      />
      <ProfileApplyDialog
        profile={sheet.applying}
        dirty={dirty}
        applying={profiles.apply.isPending}
        onApply={(profile) => {
          void sheet.apply(profile);
        }}
        onClose={() => {
          sheet.setApplying(null);
        }}
      />
      <ConfirmModal
        open={sheet.deleting !== null}
        title={t("profiles.deleteConfirmTitle", { name: sheet.deleting?.name ?? "" })}
        message={t("profiles.deleteDesc")}
        confirmLabel={t("profiles.deleteAction")}
        loadingLabel={t("profiles.deleting")}
        isLoading={profiles.remove.isPending}
        onConfirm={() => {
          if (sheet.deleting) void sheet.remove(sheet.deleting);
        }}
        onCancel={() => {
          sheet.setDeleting(null);
        }}
      />
    </>
  );
}
