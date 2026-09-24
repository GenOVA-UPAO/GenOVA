import { Icon } from "@/core/components/icon";

import type { ChatRegeneration } from "../../hooks/use-chat-regeneration";
import { ChatProgressBar } from "./chat-progress-bar";

function runningTarget(labels: string[] | undefined): string {
  if (!labels?.length) return "el OVA";
  if (labels.length === 1) return `«${labels[0]}»`;
  return `${String(labels.length)} recursos`;
}

interface Props {
  regen: ChatRegeneration;
  reorderError?: string;
}

/**
 * Pie del panel del OVA: avance de la regeneración en curso (venga del chat o
 * de «Regenerar recurso») y errores que afectan a lo que se ve en el panel.
 * En móvil es lo único que avisa, porque el chat queda en la otra vista.
 */
export function WorkspaceRegenStatus({ regen, reorderError }: Readonly<Props>) {
  const startError = regen.request.error?.message;
  return (
    <>
      {regen.busy && (
        <div
          role="status"
          className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border bg-card px-4 py-2 text-sm"
        >
          <span className="flex min-w-0 items-center gap-2 text-foreground">
            <Icon name="spinner" className="size-4 shrink-0 animate-spin text-primary" />
            <span className="truncate">Regenerando {runningTarget(regen.runningLabels)}…</span>
          </span>
          <ChatProgressBar
            percentage={regen.progress.percentage}
            className="min-w-32 flex-1 sm:max-w-56"
          />
        </div>
      )}
      {/* En escritorio el hilo de la izquierda ya lo muestra: aquí solo se anuncia. En móvil el hilo queda en la otra vista. */}
      {!regen.busy && startError && (
        <p
          role="alert"
          className="flex shrink-0 items-start gap-1.5 border-t border-border px-4 py-2 text-sm text-destructive md:sr-only"
        >
          <Icon name="warning-circle" className="mt-0.5 size-4 shrink-0" />
          {startError}
        </p>
      )}
      {reorderError && (
        <p
          role="alert"
          className="flex shrink-0 items-start gap-1.5 border-t border-border px-4 py-2 text-sm text-destructive"
        >
          <Icon name="warning-circle" className="mt-0.5 size-4 shrink-0" />
          No se pudo cambiar el orden. {reorderError}
        </p>
      )}
    </>
  );
}
