import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface UnsavedChangesBarProps {
  /** Por qué no se puede guardar todavía (y en qué tareas), o null si se puede. */
  blockingMessage: string | null;
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void;
}

export function UnsavedChangesBar({
  blockingMessage,
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
      className="sticky bottom-4 z-30 rounded-xl border border-border bg-card/95 px-4 py-3 shadow-xs backdrop-blur"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 text-sm text-foreground sm:items-center" role="status">
          {blockingMessage ? (
            <Icon
              name="warning"
              size="text-base"
              className="mt-0.5 shrink-0 text-accent-brand sm:mt-0"
            />
          ) : (
            <span aria-hidden="true" className="mt-1.5 size-2 shrink-0 rounded-full bg-accent-brand sm:mt-0" />
          )}
          {blockingMessage ?? "Tienes cambios sin guardar."}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" className="max-sm:h-11 max-sm:flex-1" onClick={onDiscard}>
            Descartar cambios
          </Button>
          <Button
            className="max-sm:h-11 max-sm:flex-1"
            onClick={onSave}
            loading={saving}
            disabled={blockingMessage !== null}
          >
            Guardar cambios
          </Button>
        </div>
      </div>
    </div>
  );
}
