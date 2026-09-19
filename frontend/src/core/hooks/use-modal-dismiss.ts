import { useEffect, useRef } from "react";

import { isTopModal, popModal, pushModal } from "@/core/lib/modal-stack";

/**
 * Escape a nivel de documento para overlays propios (no Radix). Solo cierra el
 * modal superior del stack compartido. Los diálogos de `ui/dialog` ya gestionan
 * Escape y apilado por su cuenta.
 */
export function useModalDismiss(onDismiss: () => void, enabled = true): void {
  const dismissRef = useRef(onDismiss);

  useEffect(() => {
    dismissRef.current = onDismiss;
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const id = pushModal();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && isTopModal(id)) dismissRef.current();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      popModal(id);
    };
  }, [enabled]);
}
