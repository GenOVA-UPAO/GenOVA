import { useState } from "react";
import { toast } from "sonner";

import { ConfirmModal } from "@/core/components/confirm-modal";
import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { errorMessage } from "../hooks/error-message";
import { useUserApiKeys } from "../hooks/use-user-api-keys";

interface UserKeyRemoveProps {
  provider: string;
  label: string;
}

/**
 * Quitar la clave propia de un proveedor. El backend lo admitía
 * (`{provider: ""}`) pero la interfaz no tenía forma de hacerlo.
 */
export function UserKeyRemove({ provider, label }: Readonly<UserKeyRemoveProps>) {
  const { save, saving } = useUserApiKeys();
  const [open, setOpen] = useState(false);

  const remove = async () => {
    try {
      await save({ provider, key: "" });
      setOpen(false);
      toast.success(`Clave de ${label} eliminada`);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "No se pudo eliminar la clave."));
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive max-sm:size-11"
        aria-label={`Quitar tu clave de ${label}`}
        title="Quitar clave"
        onClick={() => {
          setOpen(true);
        }}
      >
        <Icon name="trash" size="text-base" />
      </Button>
      <ConfirmModal
        open={open}
        title={`¿Quitar tu clave de ${label}?`}
        message="Tus OVAs volverán a usar la clave y los modelos de la plataforma para este proveedor."
        confirmLabel="Quitar clave"
        loadingLabel="Quitando…"
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
