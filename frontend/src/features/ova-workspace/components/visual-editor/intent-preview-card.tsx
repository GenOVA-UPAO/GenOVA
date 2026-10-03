import { Icon } from "@/core/components/icon";

import type { IntentTrace, InterpretedIntent } from "../../lib/visual-editor.types";
import { IntentConfirmationCard } from "./intent-confirmation-card";
import { IntentEmptyCard } from "./intent-empty-card";
import { IntentOutOfScopeCard } from "./intent-out-of-scope-card";

interface Props {
  intent: InterpretedIntent | null;
  trace: IntentTrace | null;
  canUndo: boolean;
  onUndo: () => void;
  isPendingConfirmation?: boolean;
  onConfirm?: () => void;
  onCancel?: () => void;
}

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  quitar: {
    label: "Quitar",
    color: "text-rose-700 dark:text-rose-300",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-800",
  },
  mover: {
    label: "Mover",
    color: "text-indigo-700 dark:text-indigo-300",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    border: "border-indigo-200 dark:border-indigo-800",
  },
  anadir: {
    label: "Añadir",
    color: "text-emerald-700 dark:text-emerald-300",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  reemplazar: {
    label: "Reemplazar",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
  },
  ninguna: {
    label: "Sin cambios",
    color: "text-muted-foreground",
    bg: "bg-muted/50",
    border: "border-border",
  },
};

const TYPE_NAMES: Record<string, string> = {
  example: "Ejemplo",
  question: "Pregunta",
  paragraph: "Párrafo",
  summary: "Resumen",
  panel: "Viñeta",
  header: "Encabezado",
  objective: "Objetivo",
  steps: "Pasos",
  card: "Tarjeta",
};

function getConfidenceBadgeClass(confPct: number): string {
  if (confPct >= 80) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300";
  if (confPct >= 50) return "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300";
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300";
}

function formatDestinoLabel(intent: InterpretedIntent): string {
  const pos = intent.destino?.posicion;
  if (!pos) return "";
  if (pos === "inicio") return " → Al inicio";
  if (pos === "final") return " → Al final";
  const refType = intent.destino?.referencia?.tipo ? ` (${intent.destino.referencia.tipo})` : "";
  if (pos === "despues") return ` → Después de${refType}`;
  return ` → Antes de${refType}`;
}

function formatIndexLabel(indice?: number | "ultimo" | "penultimo" | null): string {
  if (indice === "ultimo") return " (Último)";
  if (indice === "penultimo") return " (Penúltimo)";
  if (typeof indice === "number") return ` #${indice.toString()}`;
  return "";
}

function formatTypeLabel(rawType?: string | null): string {
  if (!rawType) return "Bloque";
  return TYPE_NAMES[rawType] ?? rawType;
}

function renderSpecialState(
  intent: InterpretedIntent,
  isPending?: boolean,
  onConfirm?: () => void,
  onCancel?: () => void
) {
  if (intent.es_fuera_de_alcance) {
    return <IntentOutOfScopeCard motivo={intent.motivo} />;
  }
  if (isPending) {
    return <IntentConfirmationCard intent={intent} onConfirm={onConfirm} onCancel={onCancel} />;
  }
  if (intent.accion === "ninguna") {
    return <IntentEmptyCard motivo={intent.motivo} razon={intent.razon} />;
  }
  return null;
}

export function IntentPreviewCard({
  intent,
  trace,
  canUndo,
  onUndo,
  isPendingConfirmation,
  onConfirm,
  onCancel,
}: Readonly<Props>) {
  if (!intent) return null;

  const special = renderSpecialState(intent, isPendingConfirmation, onConfirm, onCancel);
  if (special) return special;

  const meta = ACTION_CONFIG[intent.accion] ?? ACTION_CONFIG.ninguna;
  const typeLabel = formatTypeLabel(intent.bloque?.tipo);
  const indexLabel = formatIndexLabel(intent.bloque?.indice);
  const destinoLabel = formatDestinoLabel(intent);
  const confPct = Math.round(intent.confianza * 100);

  return (
    <div className={`rounded-lg border ${meta.border} ${meta.bg} p-3.5 space-y-2.5 transition-opacity`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 font-semibold text-sm ${meta.color}`}>
            <Icon name="check-circle" className="size-4" weight="fill" />
            {meta.label} → {typeLabel}{indexLabel}{destinoLabel}
          </span>
          <span className={`rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold ${getConfidenceBadgeClass(confPct)}`}>
            {confPct.toString()}% conf.
          </span>
        </div>

        {canUndo ? (
          <button
            type="button"
            onClick={onUndo}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon name="arrow-counter-clockwise" className="size-3.5 text-muted-foreground" />
            Deshacer
          </button>
        ) : null}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{intent.razon ?? "Operación de 1 solo paso aplicada determinísticamente"}</span>
        {trace ? (
          <span className="font-mono text-[11px]">
            {trace.backend.toUpperCase()} • {trace.elapsedMs.toString()} ms
          </span>
        ) : null}
      </div>
    </div>
  );
}
