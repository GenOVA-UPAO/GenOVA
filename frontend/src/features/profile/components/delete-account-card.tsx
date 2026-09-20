import { useState } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { DeleteAccountModal } from "./delete-account-modal";

interface DeleteAccountCardProps {
  isSubmitting: boolean;
  serverError: string;
  onDelete: (password: string) => void;
  onDismissError: () => void;
}

export function DeleteAccountCard({
  isSubmitting,
  serverError,
  onDelete,
  onDismissError,
}: Readonly<DeleteAccountCardProps>) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="glass-card rounded-3xl border-destructive/20 bg-destructive/5 p-6 sm:p-8">
      <div className="mb-4 flex flex-col gap-2 text-destructive">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold tracking-tight">
          <Icon name="warning-circle" size="text-xl" />
          Zona de peligro
        </h2>
        <p className="text-sm font-medium text-muted-foreground">
          Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, asegúrate de estar seguro.
        </p>
      </div>

      <Button
        variant="destructive"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        Eliminar cuenta
      </Button>

      {isOpen && (
        <DeleteAccountModal
          isSubmitting={isSubmitting}
          serverError={serverError}
          onDelete={onDelete}
          onClose={() => {
            setIsOpen(false);
            onDismissError();
          }}
        />
      )}
    </div>
  );
}
