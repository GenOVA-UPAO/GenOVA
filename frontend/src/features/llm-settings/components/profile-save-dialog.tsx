import { Dialog, DialogContent } from "@/core/components/ui/dialog";

import { ProfileSaveForm } from "./profile-save-form";

export interface ProfileSaveDialogProps {
  open: boolean;
  /** Hay cambios sin guardar en la página: el perfil no los incluye. */
  dirty: boolean;
  saving: boolean;
  /** Error del servidor (nombre repetido, límite de perfiles…). */
  serverError: string | null;
  onSave: (name: string) => void;
  onClose: () => void;
}

/** «Guardar como perfil»: nombre y listo. Se guarda la config de plataforma guardada. */
export function ProfileSaveDialog(props: Readonly<ProfileSaveDialogProps>) {
  return (
    <Dialog
      open={props.open}
      onOpenChange={(next) => {
        if (!next && !props.saving) props.onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        {/* Se monta de nuevo en cada apertura: el nombre empieza vacío. */}
        {props.open ? <ProfileSaveForm {...props} /> : null}
      </DialogContent>
    </Dialog>
  );
}
