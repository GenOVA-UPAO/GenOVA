import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog";
import { Input } from "@/core/components/ui/input";

import type { ProfileSaveDialogProps } from "./profile-save-dialog";
import { UnsavedNote } from "./profile-unsaved-note";

const NAME_MAX = 60;

/** Formulario de «Guardar como perfil»: nombre con su ayuda y su error debajo. */
export function ProfileSaveForm({
  dirty,
  saving,
  serverError,
  onSave,
  onClose,
}: Readonly<ProfileSaveDialogProps>) {
  const { t } = useTranslation("llm-settings");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const trimmed = name.trim();
  const localError = touched && trimmed === "" ? t("profiles.nameRequired") : null;
  const error = localError ?? serverError;

  const submit = () => {
    setTouched(true);
    if (trimmed !== "") onSave(trimmed);
  };

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <DialogHeader className="pr-8">
        <DialogTitle>{t("profiles.saveAsProfile")}</DialogTitle>
        <DialogDescription>
          {t("profiles.saveAsProfileDesc")}
        </DialogDescription>
      </DialogHeader>
      {dirty ? (
        <UnsavedNote>
          {t("profiles.unsavedWarning")}
        </UnsavedNote>
      ) : null}
      <div className="grid gap-1.5">
        <label htmlFor="profile-name" className="text-sm font-medium">
          {t("profiles.nameLabel")}
        </label>
        <Input
          id="profile-name"
          value={name}
          maxLength={NAME_MAX}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "profile-name-error" : "profile-name-help"}
          onChange={(event) => {
            setName(event.target.value);
          }}
          className="max-sm:h-11"
        />
        {error ? (
          <p id="profile-name-error" role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : (
          <p id="profile-name-help" className="text-xs text-muted-foreground">
            {t("profiles.namePlaceholder")}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" className="max-sm:h-11" disabled={saving} onClick={onClose}>
          {t("credentials.cancel")}
        </Button>
        <Button type="submit" className="max-sm:h-11" loading={saving}>
          {t("tools.saveProfile")}
        </Button>
      </DialogFooter>
    </form>
  );
}
