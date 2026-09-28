import { useState } from "react";
import { toast } from "sonner";

/** Tiempo para deshacer antes de borrar el mensaje en el servidor. */
export const CHAT_UNDO_MS = 6000;

function without(ids: string[], id: string): string[] {
  return ids.filter((value) => value !== id);
}

/**
 * Borrar un mensaje del chat con «Deshacer». El borrado en el servidor es
 * definitivo, así que el mensaje se oculta al momento y solo se borra cuando
 * el aviso se cierra sin haber pulsado «Deshacer».
 */
export function useUndoableChatDelete(remove: (id: string) => void) {
  const [hidden, setHidden] = useState<string[]>([]);
  const request = (id: string) => {
    let settled = false;
    const settle = (undo: boolean) => {
      if (settled) return;
      settled = true;
      if (undo) {
        setHidden((ids) => without(ids, id));
      } else {
        remove(id);
      }
    };
    setHidden((ids) => [...ids, id]);
    toast("Mensaje eliminado.", {
      duration: CHAT_UNDO_MS,
      action: {
        label: "Deshacer",
        onClick: () => {
          settle(true);
        },
      },
      onAutoClose: () => {
        settle(false);
      },
      onDismiss: () => {
        settle(false);
      },
    });
  };
  return { hidden, request };
}
