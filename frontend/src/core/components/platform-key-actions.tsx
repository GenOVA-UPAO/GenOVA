import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface PlatformKeyActionsProps {
  editing: boolean;
  configured: boolean;
  saving: boolean;
  canSave: boolean;
  label: string;
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
        <Button
          className="flex-1 sm:flex-none"
          onClick={props.onSave}
          loading={saving}
          disabled={!props.canSave}
        >
          Guardar clave
        </Button>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 gap-2">
      <Button variant="outline" size="sm" onClick={props.onEdit} disabled={saving}>
        {configured ? "Cambiar" : "Configurar"}
      </Button>
      {configured && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={props.onDelete}
          disabled={saving}
          aria-label={`Eliminar clave de ${label}`}
          title="Eliminar clave"
        >
          <Icon name="trash" size="text-base" />
        </Button>
      )}
    </div>
  );
}
