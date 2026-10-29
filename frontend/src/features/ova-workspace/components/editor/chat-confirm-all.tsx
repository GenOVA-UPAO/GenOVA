import { useTranslation } from "react-i18next";

import { ConfirmModal } from "@/core/components/confirm-modal";

import { estimateEditMinutes } from "../../lib/regen-cancel";
import type { RegenPayload } from "../../lib/regen-chat";

interface Props {
  /** Instrucción pendiente de confirmar (undefined = el diálogo está cerrado). */
  payload: RegenPayload | undefined;
  count: number;
  onConfirm: (payload: RegenPayload) => void;
  onCancel: () => void;
}

/** Confirmación antes de aplicar una instrucción a todo un OVA con muchos recursos. */
export function ChatConfirmAll({ payload, count, onConfirm, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  if (!payload) return null;
  return (
    <ConfirmModal
      title={t("workspace:confirmAllTitle")}
      message={t("workspace:confirmAllMessage", { count, minutes: estimateEditMinutes(count) })}
      confirmLabel={t("workspace:confirmAllAction")}
      danger={false}
      onConfirm={() => { onConfirm(payload); }}
      onCancel={onCancel}
    />
  );
}
