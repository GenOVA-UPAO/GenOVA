import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { ConfirmModal } from "@/core/components/confirm-modal";
import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { Tooltip } from "@/core/components/ui/tooltip";

import { errorMessage } from "../hooks/error-message";
import { useUserApiKeys } from "../hooks/use-user-api-keys";

interface UserKeyRemoveProps {
  provider: string;
  label: string;
  /** Tras quitarla, este botón desaparece: la fila decide adónde va el foco. */
  onRemoved: () => void;
}

/**
 * Quitar la clave propia de un proveedor. El backend lo admitía
 * (`{provider: ""}`) pero la interfaz no tenía forma de hacerlo.
 */
export function UserKeyRemove({ provider, label, onRemoved }: Readonly<UserKeyRemoveProps>) {
  const { t } = useTranslation("llm-settings");
  const { save, saving } = useUserApiKeys();
  const [open, setOpen] = useState(false);

  const remove = async () => {
    try {
      await save({ provider, key: "" });
      setOpen(false);
      onRemoved();
      toast.success(t("credentials.removedKeySuccess", { provider: label }));
    } catch (err: unknown) {
      toast.error(errorMessage(err, t("credentials.deleteError")));
    }
  };

  return (
    <>
      <Tooltip label={t("credentials.removeKeyAction")} side="top">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive max-sm:size-11"
          aria-label={t("credentials.removeYourKey", { provider: label })}
          onClick={() => {
            setOpen(true);
          }}
        >
          <Icon name="trash" size="text-base" />
        </Button>
      </Tooltip>
      <ConfirmModal
        open={open}
        title={t("credentials.removeKeyTitle", { provider: label })}
        message={t("credentials.removeKeyDesc")}
        confirmLabel={t("credentials.removeKeyAction")}
        loadingLabel={t("credentials.removing")}
        isLoading={saving}
        onConfirm={() => {
          void remove();
        }}
        onCancel={() => {
          setOpen(false);
        }}
      />
    </>
  );
}
