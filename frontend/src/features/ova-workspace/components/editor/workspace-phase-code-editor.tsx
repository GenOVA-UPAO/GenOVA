import { Button } from "@/core/components/ui/button";

interface Props {
  id: string;
  value: string;
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onDiscard: () => void;
}

function stateText(dirty: boolean, saved: boolean): string {
  if (dirty) return "Cambios sin guardar.";
  if (saved) return "Cambios guardados. Ya se ven en la vista previa.";
  return "Sin cambios.";
}

/** Editor del HTML de un recurso: plegado por defecto, es la vía avanzada. */
export function WorkspacePhaseCodeEditor({
  id,
  value,
  dirty,
  saving,
  saved,
  onChange,
  onSave,
  onDiscard,
}: Readonly<Props>) {
  return (
    <div id={id} className="space-y-2 border-t border-border p-3">
      <label htmlFor={`${id}-field`} className="text-xs font-medium text-muted-foreground">
        Código HTML del recurso
      </label>
      <textarea
        id={`${id}-field`}
        rows={10}
        spellCheck={false}
        aria-describedby={`${id}-state`}
        className="block w-full resize-y rounded-lg border border-input bg-background p-3 font-mono text-xs leading-relaxed focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={!dirty}
          loading={saving}
          aria-describedby={`${id}-state`}
          onClick={onSave}
        >
          Guardar cambios
        </Button>
        {dirty && (
          <Button size="sm" variant="ghost" disabled={saving} onClick={onDiscard}>
            Descartar cambios
          </Button>
        )}
        <span id={`${id}-state`} role="status" className="text-xs text-muted-foreground">
          {stateText(dirty, saved)}
        </span>
      </div>
    </div>
  );
}
