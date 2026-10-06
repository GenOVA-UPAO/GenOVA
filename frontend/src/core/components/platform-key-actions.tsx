import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { Tooltip } from "@/core/components/ui/tooltip";

interface PlatformKeyActionsProps {
  editing: boolean;
  configured: boolean;
  /** Sin clave guardada pero con una en el servidor: se puede sustituir, no quitar. */
  serverKey: boolean;
  saving: boolean;
  /** «Probar conexión» en curso. */
  checking: boolean;
  label: string;
  onCheck: () => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function PlatformKeyActions(props: Readonly<PlatformKeyActionsProps>) {
  const { t } = useTranslation();
  const { editing, configured, saving, label } = props;
  if (editing) {
    return (
      <div className="flex gap-2 sm:self-end">
        <Button variant="outline" className="flex-1 sm:flex-none" onClick={props.onCancel}>
          {t("shared:cancelar")} </Button>
        <Button className="flex-1 sm:flex-none" onClick={props.onSave} loading={saving}>
          {t("shared:guardar_clave")} </Button>
      </div>
    );
  }
  const hasKey = configured || props.serverKey;
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {hasKey && (
        <Button
          variant="ghost"
          size="sm"
          className="max-sm:h-11"
          onClick={props.onCheck}
          disabled={saving}
          loading={props.checking}
          aria-label={t("shared:probar_conexion_con_value", { p0: label })}
        >
          {t("shared:probar_conexion")} </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        className="max-sm:h-11"
        data-key-edit=""
        onClick={props.onEdit}
        disabled={saving}
        aria-label={
          configured
            ? t("shared:cambiar_la_clave_de_value", { p0: label })
            : t("shared:value_de_value", { p0: t(actionLabel(configured, props.serverKey)), p1: label })
        }
      >
        {t(actionLabel(configured, props.serverKey))}
      </Button>
      {configured && (
        <Tooltip label={t("shared:eliminar_clave")} side="top">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive max-sm:size-11"
            onClick={props.onDelete}
            disabled={saving}
            aria-label={t("shared:eliminar_clave_de_value", { p0: label })}
          >
            <Icon name="trash" size="text-base" />
          </Button>
        </Tooltip>
      )}
    </div>
  );
}

function actionLabel(configured: boolean, serverKey: boolean): string {
  if (configured) return "shared:cambiar";
  return serverKey ? "shared:usar_otra_clave" : "shared:anadir_clave";
}
