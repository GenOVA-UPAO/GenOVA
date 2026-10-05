import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ConfirmModal } from "@/core/components/confirm-modal";
import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

interface Props {
  busy: boolean;
  onRegenAll: () => void;
}

/** Cabecera del panel: mismo alto que la barra del visor para que ambas columnas alineen. */
export function ChatPanelHeader({ busy, onRegenAll }: Readonly<Props>) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="flex h-12 shrink-0 items-center justify-end gap-2 border-b border-border px-4 md:justify-between">
      {/* En móvil el conmutador de vista ya dice «Instrucciones». */}
      <h2 className="sr-only text-sm font-semibold text-foreground md:not-sr-only">{t("workspace:instrucciones")}</h2>
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={() => {
          setConfirm(true);
        }}
      >
        <Icon name="arrow-clockwise" className={cn(busy && "animate-spin")} />
        {t("workspace:regenerar_ova_completo")} </Button>
      {confirm && (
        <ConfirmModal
          title={t("workspace:regenerar_el_ova_completo")}
          message={t("workspace:la_ia_volvera_a_crear_todos_los_recursos_desd_2f6395")}
          confirmLabel={t("workspace:regenerar_ova")}
          danger={false}
          onConfirm={() => {
            setConfirm(false);
            onRegenAll();
          }}
          onCancel={() => {
            setConfirm(false);
          }}
        />
      )}
    </div>
  );
}
