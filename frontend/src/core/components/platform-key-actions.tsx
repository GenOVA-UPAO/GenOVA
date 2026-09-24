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
  const { editing, configured, saving, label } = props;
  if (editing) {
    return (
      <div className="flex gap-2 sm:self-end">
        <Button variant="outline" className="flex-1 sm:flex-none" onClick={props.onCancel}>
          Cancelar
        </Button>
        <Button className="flex-1 sm:flex-none" onClick={props.onSave} loading={saving}>
          Guardar clave
        </Button>
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
          aria-label={`Probar conexión con ${label}`}
        >
          Probar conexión
        </Button>
      )}
      <Button
        variant="outline"
        size="sm"
        className="max-sm:h-11"
        data-key-edit=""
        onClick={props.onEdit}
        disabled={saving}
      >
        {actionLabel(configured, props.serverKey)}
      </Button>
      {configured && (
        <Tooltip label="Eliminar clave" side="top">
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive max-sm:size-11"
            onClick={props.onDelete}
            disabled={saving}
            aria-label={`Eliminar clave de ${label}`}
          >
            <Icon name="trash" size="text-base" />
          </Button>
        </Tooltip>
      )}
    </div>
  );
}

function actionLabel(configured: boolean, serverKey: boolean): string {
  if (configured) return "Cambiar";
  return serverKey ? "Usar otra clave" : "Añadir clave";
}
