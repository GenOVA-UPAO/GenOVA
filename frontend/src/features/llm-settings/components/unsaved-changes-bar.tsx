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
    <div
      role="region"
      aria-label="Cambios sin guardar"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground" role="status">
          {chainInvalid
            ? "Corrige los modelos duplicados o vacíos para guardar."
            : "Tienes cambios sin guardar en la asignación."}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="max-sm:h-11 max-sm:flex-1" onClick={onDiscard}>
            Descartar cambios
          </Button>
          <Button
            className="max-sm:h-11 max-sm:flex-1"
            onClick={onSave}
            loading={saving}
            disabled={chainInvalid}
          >
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
