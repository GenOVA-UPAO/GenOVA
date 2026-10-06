import type { Ref } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/core/components/ui/button";

interface UserKeyRowActionsProps {
  /** Botón «Añadir/Cambiar clave»: recibe el foco al cancelar, guardar o quitar. */
  startRef?: Ref<HTMLButtonElement>;
  editing: boolean;
  configured: boolean;
  saving: boolean;
  /** «Probar conexión» (solo con clave guardada y fuera de edición). */
  checking?: boolean;
  /** Nombre del proveedor, para distinguir los «Probar conexión» de cada fila. */
  label?: string;
  onCheck?: () => void;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function UserKeyRowActions({
  startRef,
  editing,
  configured,
  saving,
  checking = false,
  label = "",
  onCheck,
  onStart,
  onCancel,
  onSave,
}: Readonly<UserKeyRowActionsProps>) {
  const { t } = useTranslation("llm-settings");
  const startLabel = configured ? t("credentials.changeKey") : t("credentials.addKey");
  if (editing) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" className="max-sm:h-11 max-sm:flex-1" onClick={onCancel}>
          {t("credentials.cancel")}
        </Button>
        <Button className="max-sm:h-11 max-sm:flex-1" loading={saving} onClick={onSave}>
          {t("credentials.saveKey")}
        </Button>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {configured && onCheck ? (
        <Button
          variant="ghost"
          className="max-sm:h-11"
          loading={checking}
          aria-label={label ? t("credentials.testConnectionWith", { provider: label }) : undefined}
          onClick={onCheck}
        >
          {t("credentials.testConnection")}
        </Button>
      ) : null}
      <Button
        ref={startRef}
        variant="outline"
        className="shrink-0 max-sm:h-11"
        data-key-edit=""
        aria-label={label ? t("credentials.keyActionFor", { action: startLabel, provider: label }) : undefined}
        onClick={onStart}
      >
        {startLabel}
      </Button>
    </div>
  );
}
