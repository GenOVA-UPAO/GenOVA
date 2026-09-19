import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface PlatformKeyActionsProps {
  editing: boolean;
  configured: boolean;
  saving: boolean;
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ACTION_CLASS = "h-9 w-full sm:w-auto";

export function PlatformKeyActions(props: Readonly<PlatformKeyActionsProps>) {
  const { editing, configured, saving } = props;
  if (editing) {
    return (
      <div className="flex gap-2">
        <Button
          className={`${ACTION_CLASS} font-bold`}
          onClick={props.onSave}
          disabled={saving || !props.canSave}
        >
          {saving ? "..." : "Guardar"}
        </Button>
        <Button variant="outline" className={ACTION_CLASS} onClick={props.onCancel}>
          Cancelar
        </Button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <Button
        variant={configured ? "outline" : "default"}
        className={configured ? ACTION_CLASS : `${ACTION_CLASS} font-bold`}
        onClick={props.onEdit}
        disabled={saving}
      >
        {configured ? "Cambiar" : "Configurar"}
      </Button>
      {configured && (
        <Button
          variant="outline"
          className={`${ACTION_CLASS} border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive`}
          onClick={props.onDelete}
          disabled={saving}
          aria-label="Eliminar clave"
        >
          <Icon name="trash" size="text-base" />
        </Button>
      )}
    </div>
  );
}
