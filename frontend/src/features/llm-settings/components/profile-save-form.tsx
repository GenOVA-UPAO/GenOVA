import { useState } from "react";

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
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const trimmed = name.trim();
  const localError = touched && trimmed === "" ? "Escribe un nombre para el perfil." : null;
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
      <DialogHeader>
        <DialogTitle>Guardar como perfil</DialogTitle>
        <DialogDescription>
          Guarda el modelo principal y los de respaldo de cada tarea con un nombre, para volver a
          esta configuración en un clic.
        </DialogDescription>
      </DialogHeader>
      {dirty ? (
        <UnsavedNote>
          Tus cambios sin guardar no entran en el perfil: guárdalos antes si quieres incluirlos.
        </UnsavedNote>
      ) : null}
      <div className="grid gap-1.5">
        <label htmlFor="profile-name" className="text-sm font-medium">
          Nombre del perfil
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
            Por ejemplo: «Económico», «Máxima calidad» o «Solo Groq».
          </p>
        )}
      </div>
      <DialogFooter>
        <Button variant="outline" className="max-sm:h-11" disabled={saving} onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="max-sm:h-11" loading={saving}>
          Guardar perfil
        </Button>
      </DialogFooter>
    </form>
  );
}
