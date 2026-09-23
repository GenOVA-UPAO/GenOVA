import { Button } from "@/core/components/ui/button";

interface UserKeyRowActionsProps {
  editing: boolean;
  configured: boolean;
  saving: boolean;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function UserKeyRowActions({
  editing,
  configured,
  saving,
  onStart,
  onCancel,
  onSave,
}: Readonly<UserKeyRowActionsProps>) {
  if (editing) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" className="max-sm:h-11 max-sm:flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="max-sm:h-11 max-sm:flex-1" loading={saving} onClick={onSave}>
          Guardar clave
        </Button>
      </div>
    );
  }
  return (
    <Button variant="outline" className="shrink-0 max-sm:h-11" onClick={onStart}>
      {configured ? "Cambiar clave" : "Añadir clave"}
    </Button>
  );
}
