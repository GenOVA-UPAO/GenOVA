import { cn } from "@/core/lib/cn";

interface UserKeyRowActionsProps {
  editing: boolean;
  configured: boolean;
  saving: boolean;
  canSave: boolean;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function UserKeyRowActions({
  editing,
  configured,
  saving,
  canSave,
  onStart,
  onCancel,
  onSave,
}: Readonly<UserKeyRowActionsProps>) {
  if (editing) {
    return (
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !canSave}
          className="h-9 rounded-md bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "..." : "Guardar"}
        </button>
        <button type="button" onClick={onCancel} className="h-9 rounded-md border px-3 text-xs">
          Cancelar
        </button>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onStart}
        className={cn(
          "h-9 rounded-md px-3 text-xs font-bold",
          configured ? "border" : "bg-primary text-primary-foreground",
        )}
      >
        {configured ? "Cambiar" : "Configurar"}
      </button>
    </div>
  );
}
