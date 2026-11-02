import { useQuery } from "@tanstack/react-query";
import i18n from "i18next";
import { useEffect, useRef } from "react";

import { fetchActiveRegeneration } from "../api/ova-workspace.api";
import type { RegenChatMessage } from "../lib/regen-chat";

interface Options {
  ovaId: string;
  messages: RegenChatMessage[] | undefined;
  /** Mensaje que ya sondea esta sesión (no es huérfano). */
  own: RegenChatMessage | undefined;
  /** Hay una petición arrancando: su mensaje aún no tiene job. */
  starting: boolean;
  patch: (message: RegenChatMessage) => Promise<unknown>;
  adopt: (message: RegenChatMessage, jobId: string) => void;
}

/**
 * Mensajes «en curso» que dejó otra sesión (se recargó o se salió del editor
 * a mitad de una regeneración). Solo la sesión que la lanzó actualiza el hilo,
 * así que se quedaban girando para siempre y sin botón de eliminar. Si la
 * regeneración sigue activa, se adopta el último para seguir su progreso; si
 * no, se cierran como interrumpidos.
 */
export function useOrphanRegenMessages({ ovaId, messages, own, starting, patch, adopt }: Options): void {
  const orphans = (messages ?? []).filter((m) => m.role === "assistant" && m.status === "running" && m.id !== own?.id);
  const active = useQuery({
    queryKey: ["ova-active-regen", ovaId],
    queryFn: () => fetchActiveRegeneration(ovaId),
    enabled: orphans.length > 0 && !starting,
  });
  const handled = useRef(new Set<string>());
  const ready = active.isSuccess && !active.isFetching && !starting;
  const jobId = active.data?.job_id ?? undefined;
  useEffect(() => {
    if (!ready) return;
    // Cada huérfano se atiende una sola vez aunque el efecto se repita.
    const pending = orphans.filter((m) => !handled.current.has(m.id));
    for (const message of pending) handled.current.add(message.id);
    const adopted = jobId ? pending.at(-1) : undefined;
    if (adopted && jobId) adopt(adopted, jobId);
    const text = i18n.t("workspace:regeneracion_interrumpida");
    for (const message of pending) {
      if (message !== adopted) void patch({ ...message, status: "error", text }).catch(() => undefined);
    }
  }, [ready, orphans, jobId, patch, adopt]);
}
