import { type SyntheticEvent, useState } from "react";
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
  const { t } = useTranslation("profile");
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
          <DialogTitle>{t("delete.modalTitle")}</DialogTitle>
          <DialogDescription>
            {t("delete.modalDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="delete-password">{t("delete.passwordLabel")}</Label>
            <PasswordInput
              id="delete-password"
              autoComplete="current-password"
              value={password}
              disabled={isSubmitting}
              aria-invalid={showError ? true : undefined}
              aria-describedby={showError ? "delete-password-error" : undefined}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
            />
            {showError && (
              <p id="delete-password-error" className="text-xs text-destructive">
                {t("delete.passwordRequired")}
              </p>
            )}
          </div>
          <ErrorAlert message={serverError} />
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t("delete.cancel")}
            </Button>
            <Button type="submit" variant="danger" loading={isSubmitting}>
              {t("delete.button")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
