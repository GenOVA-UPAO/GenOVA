import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfirmModal } from "@/core/components/confirm-modal";
import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface Props {
  name: string;
  busy: boolean;
  onRegenerate: () => void;
}

/**
 * «Regenerar recurso» con confirmación, igual que «Regenerar OVA completo»:
 * llama al modelo (cuesta dinero) y bloquea la edición mientras dura.
 */
export function RegenPhaseButton({ name, busy, onRegenerate }: Readonly<Props>) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={() => {
          setConfirm(true);
        }}
      >
        <Icon name="arrow-clockwise" />
        {t("workspace:regenerar_recurso")} </Button>
      {confirm && (
        <ConfirmModal
          title={t("workspace:regenerar_este_recurso")}
          message={t("workspace:la_ia_volvera_a_crear_value_desde_cero_la_ver_e99a7f", { p0: name })}
          confirmLabel={t("workspace:regenerar_recurso")}
          danger={false}
          onConfirm={() => {
            setConfirm(false);
            onRegenerate();
          }}
          onCancel={() => {
            setConfirm(false);
          }}
        />
      )}
    </>
  );
}
