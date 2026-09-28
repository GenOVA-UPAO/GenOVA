import { useEffect, useRef, useState } from "react";

import { useSavePlatformKey } from "@/core/hooks/use-platform-config";

/** Borrador de la clave de un proveedor: `null` = sin editar (se ve la enmascarada). */
export function usePlatformKeyDraft(provider: string, onKeySaved?: () => void) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraftState] = useState<string | null>(null);
  // «Guardar clave» no se deshabilita con el campo vacío: al pulsarlo se dice
  // qué falta junto al campo, en vez de un botón gris que no explica nada.
  const [missingKey, setMissingKey] = useState(false);
  const save = useSavePlatformKey();
  const editing = draft !== null;

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const setDraft = (value: string | null) => {
    setMissingKey(false);
    setDraftState(value);
  };
  const trimmed = draft?.trim() ?? "";

  const persist = (key: string, onDone?: () => void) => {
    save.mutate(
      { provider, key },
      {
        onSuccess: () => {
          setDraftState(null);
          onDone?.();
        },
      },
    );
  };

  /** Guarda el borrador; vacío, marca el campo y le devuelve el foco. */
  const saveDraft = () => {
    if (trimmed === "") {
      setMissingKey(true);
      inputRef.current?.focus();
      return;
    }
    persist(trimmed, onKeySaved);
  };

  return { inputRef, draft, setDraft, editing, missingKey, save, persist, saveDraft };
}
