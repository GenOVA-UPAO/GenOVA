import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

import { generateBlocker, selectionSummary } from "../../lib/creation-guidance";

interface Props {
  prompt: string;
  phases: number;
  total: number;
  ready: boolean;
  /** El usuario intentó generar con el formulario incompleto: la guía pasa a error. */
  attempted: boolean;
  error?: string;
  onGenerate: () => void;
}

const REASON_ID = "crear-generate-reason";

function reasonText(prompt: string, phases: number, total: number, ready: boolean): string {
  const blocker = generateBlocker(prompt, phases);
  if (blocker) return blocker;
  if (!ready) return "Espera a que termine la subida de archivos.";
  return `Listo para generar: ${selectionSummary(total, phases).toLowerCase()}.`;
}

/** Pie del formulario: explica junto al botón por qué aún no se puede generar. */
export function CreationSubmitBar({ prompt, phases, total, ready, attempted, error, onGenerate }: Readonly<Props>) {
  const blocked = !ready;
  return (
    <div className="space-y-2 rounded-b-xl border-t border-border bg-muted/40 px-4 py-3 sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          id={REASON_ID}
          aria-live="polite"
          className={cn(
            "flex items-start gap-1.5 text-sm",
            blocked && attempted ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          <Icon
            name={blocked ? "info" : "check-circle"}
            className={cn("mt-0.5 size-4 shrink-0", !blocked && "text-success")}
          />
          <span>{reasonText(prompt, phases, total, ready)}</span>
        </p>
        <span id="tour-crear-ova-generar" className="inline-flex w-full shrink-0 sm:w-auto">
          <Button
            size="lg"
            className="w-full sm:w-auto"
            disabled={blocked}
            aria-describedby={REASON_ID}
            onClick={onGenerate}
          >
            Generar OVA
          </Button>
        </span>
      </div>
      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
