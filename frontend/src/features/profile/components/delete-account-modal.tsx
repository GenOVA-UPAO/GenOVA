import { type SyntheticEvent, useState } from "react";

import { Button } from "@/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Label } from "@/core/components/ui/label";
import { PasswordInput } from "@/core/components/ui/password-input";

import { ErrorAlert } from "./error-alert";

interface DeleteAccountModalProps {
  isSubmitting: boolean;
  serverError: string;
  onDelete: (password: string) => void;
  onClose: () => void;
}

export function DeleteAccountModal({
  isSubmitting,
  serverError,
  onDelete,
  onClose,
}: Readonly<DeleteAccountModalProps>) {
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const showError = touched && password === "";

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched(true);
    if (password === "") return;
    onDelete(password);
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>¿Estás completamente seguro?</DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Esto desactivará tu cuenta y anonimizará tus datos
            personales. Tus OVAs generados se mantendrán en el sistema pero perderán tu autoría.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4" noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="delete-password">Contraseña actual</Label>
            <PasswordInput
              id="delete-password"
              placeholder="Ingresa tu contraseña para confirmar"
              autoComplete="current-password"
              value={password}
              disabled={isSubmitting}
              aria-invalid={showError ? true : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
            {showError && (
              <p className="text-xs text-destructive">La contraseña es requerida para confirmar</p>
            )}
          </div>
          <ErrorAlert message={serverError} />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting || password === ""}>
              {isSubmitting ? "Eliminando..." : "Sí, eliminar cuenta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
