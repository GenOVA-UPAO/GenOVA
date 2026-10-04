import { Icon } from "@/core/components/icon";

import type { InterpretedIntent } from "../../lib/visual-editor.types";

interface Props {
  readonly intent: InterpretedIntent;
  readonly onConfirm?: () => void;
  readonly onCancel?: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  quitar: "Quitar",
  mover: "Mover",
  anadir: "Añadir",
  ninguna: "Sin cambios",
};

export function IntentConfirmationCard({ intent, onConfirm, onCancel }: Props) {
  const actionLabel = ACTION_LABELS[intent.accion] ?? "Modificar";
  const typeLabel = intent.bloque?.tipo ?? "bloque";
  const indexLabel = intent.bloque?.indice ? ` #${String(intent.bloque.indice)}` : "";
  const targetDesc = intent.bloque_descripcion ?? `${typeLabel}${indexLabel}`;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 space-y-3 dark:border-amber-700 dark:bg-amber-950/40">
      <div className="flex items-start gap-2.5">
        <Icon name="question" className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="space-y-1">
          <p className="font-semibold text-sm text-amber-950 dark:text-amber-200">
            ¿Quisiste decir {actionLabel.toLowerCase()} {targetDesc}?
          </p>
          <p className="text-xs text-amber-800 dark:text-amber-300">
            {intent.razon ?? "Confirma para aplicar esta modificación a los bloques."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors shadow-xs focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <Icon name="check" className="size-3.5" />
          Confirmar
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Icon name="x" className="size-3.5 text-muted-foreground" />
          Cancelar
        </button>
      </div>
    </div>
  );
}
