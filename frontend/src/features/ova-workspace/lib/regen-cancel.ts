import i18n from "i18next";

import type { RegenChatMessage } from "./regen-chat";

/** La regeneración se canceló: no hubo cambios, y el hilo lo dice sin pintarlo como fallo técnico. */
export function cancelledChatPatch(): Partial<RegenChatMessage> {
  return { status: "error", percentage: 100, text: i18n.t("workspace:regenCancelled") };
}

/** Minutos aproximados de una instrucción aplicada a `count` recursos (~30 s por recurso en paralelo). */
export function estimateEditMinutes(count: number): number {
  return Math.max(1, Math.ceil(count / 2));
}

/** Aplicar una instrucción a todo el OVA con más recursos que esto pide confirmación. */
export const CONFIRM_ALL_THRESHOLD = 5;
