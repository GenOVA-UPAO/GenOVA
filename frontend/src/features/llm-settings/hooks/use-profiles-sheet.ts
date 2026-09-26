import { useState } from "react";
import { toast } from "sonner";

import type { ModelProfile } from "../api/model-tools.api";
import { errorMessage } from "./error-message";
import { useConfigApply } from "./use-config-apply";
import { useModelProfiles } from "./use-model-profiles";

interface Options {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscardDraft: () => void;
}

/** Estado del panel de perfiles: qué diálogo está abierto y qué hace cada acción. */
export function useProfilesSheet({ open, onOpenChange, onDiscardDraft }: Options) {
  const profiles = useModelProfiles(open);
  const feedback = useConfigApply();
  const [saveOpen, setSaveOpen] = useState(false);
  const [applying, setApplying] = useState<ModelProfile | null>(null);
  const [deleting, setDeleting] = useState<ModelProfile | null>(null);

  const apply = async (profile: ModelProfile) => {
    try {
      const res = await profiles.apply.mutateAsync(profile.id);
      onDiscardDraft();
      await feedback.refresh();
      setApplying(null);
      onOpenChange(false);
      feedback.announce(`Perfil «${profile.name}» aplicado.`, res);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "No se pudo aplicar el perfil."));
    }
  };

  const remove = async (profile: ModelProfile) => {
    try {
      await profiles.remove.mutateAsync(profile.id);
      setDeleting(null);
      toast.success(`Perfil «${profile.name}» borrado.`);
    } catch (err: unknown) {
      toast.error(errorMessage(err, "No se pudo borrar el perfil."));
    }
  };

  const save = (name: string) => {
    profiles.create.mutate(name, {
      onSuccess: () => {
        setSaveOpen(false);
        toast.success(`Perfil «${name}» guardado.`);
      },
    });
  };

  return {
    profiles,
    full: profiles.profiles.length >= profiles.limit,
    saveOpen,
    openSave: () => {
      profiles.create.reset();
      setSaveOpen(true);
    },
    closeSave: () => {
      setSaveOpen(false);
    },
    save,
    applying,
    setApplying,
    apply,
    deleting,
    setDeleting,
    remove,
  };
}
