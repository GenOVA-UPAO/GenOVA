import { Button } from "@/core/components/ui/button";

interface UnsavedChangesBarProps {
  chainInvalid: boolean;
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

export function UnsavedChangesBar({
  chainInvalid,
  saving,
  onDiscard,
  onSave,
}: Readonly<UnsavedChangesBarProps>) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-6 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {chainInvalid
            ? "Corrige los modelos duplicados o vacíos para guardar."
            : "Tienes cambios sin guardar en la asignación."}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDiscard}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onSave} disabled={saving || chainInvalid}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      </div>
    </div>
  );
}
