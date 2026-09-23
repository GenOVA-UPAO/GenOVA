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
      // Sticky dentro del contenido: como `fixed` cruzaba la ventana entera y tapaba el
      // pie del menú lateral.
      className="sticky bottom-4 z-30 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-lg backdrop-blur"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-foreground" role="status">
          <span
            aria-hidden="true"
            className={
              chainInvalid
                ? "size-2 rounded-full bg-destructive"
                : "size-2 rounded-full bg-accent-brand"
            }
          />
          {chainInvalid
            ? "Completa o quita los respaldos vacíos y evita repetir modelos para guardar."
            : "Tienes cambios sin guardar."}
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
