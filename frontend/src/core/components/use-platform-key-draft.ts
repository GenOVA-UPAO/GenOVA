import { useEffect, useRef, useState } from "react";

import { useSavePlatformKey } from "@/core/hooks/use-platform-config";

/** Borrador de la clave de un proveedor: `null` = sin editar (se ve la enmascarada). */
export function usePlatformKeyDraft(provider: string) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const save = useSavePlatformKey();
  const editing = draft !== null;

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const persist = (key: string, onDone?: () => void) => {
    save.mutate(
      { provider, key },
      {
        onSuccess: () => {
          setDraft(null);
          onDone?.();
        },
      },
    );
  };

  return { inputRef, draft, setDraft, editing, trimmed: draft?.trim() ?? "", save, persist };
}
