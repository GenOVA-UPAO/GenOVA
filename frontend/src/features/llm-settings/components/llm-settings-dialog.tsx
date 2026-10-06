import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { useCurrentUser, useIsAdmin } from "@/core/auth/auth-store";
import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";

import { canAccessModels } from "../hooks/can-access-models";
import { useLlmSettings } from "../hooks/use-llm-settings";
import { LlmSettingsForm } from "./llm-settings-form";

interface LlmSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LlmSettingsDialog({ open, onOpenChange }: Readonly<LlmSettingsDialogProps>) {
  const { t } = useTranslation(["llm-settings", "common"]);
  const store = useLlmSettings();
  const showModelsLink = canAccessModels(useCurrentUser());
  const isAdmin = useIsAdmin();
  const copy = dialogCopy(store.hasOwnLlmKey, isAdmin, t);

  async function handleSave(): Promise<void> {
    const ok = await store.save();
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-5 sm:max-w-lg">
        <DialogHeader className="pr-8">
          <DialogTitle>{t("dialog.aiSettings")}</DialogTitle>
          <DialogDescription>
            {copy.text}
            {showModelsLink ? (
              <>
                {" "}
                {copy.linkLead}{" "}
                <Link
                  to="/models"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => {
                    onOpenChange(false);
                  }}
                >
                  {t("page.title")}
                </Link>
                .
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="-mx-1 max-h-[60vh] overflow-y-auto px-1">
          <LlmSettingsForm readOnly={!store.hasOwnLlmKey} />
        </div>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
            disabled={store.saving}
          >
            {store.hasOwnLlmKey ? t("common:actions.cancel") : t("common:actions.close")}
          </Button>
          {store.hasOwnLlmKey ? (
            <Button
              onClick={() => void handleSave()}
              loading={store.saving}
              disabled={store.loading || store.error !== ""}
            >
              {t("common:actions.save")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Qué dice el diálogo según quién lo abre. Antes, sin clave propia, repetía el
 * enlace a Modelos de IA en un segundo aviso, y al propio administrador le
 * decía que los modelos «los elige el administrador».
 */
function dialogCopy(
  hasOwnKey: boolean,
  isAdmin: boolean,
  t: (key: string) => string,
): { text: string; linkLead: string } {
  if (hasOwnKey) {
    return {
      text: t("dialog.userDialogDesc1"),
      linkLead: t("dialog.userDialogDesc2"),
    };
  }
  if (isAdmin) {
    return {
      text: t("dialog.adminDialogDesc1"),
      linkLead: t("dialog.adminDialogDesc2"),
    };
  }
  return {
    text: t("dialog.readOnlyDialogDesc1"),
    linkLead: t("dialog.readOnlyDialogDesc2"),
  };
}
