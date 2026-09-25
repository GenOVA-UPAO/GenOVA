import { HtmlPreviewFrame } from "@/core/components/html-preview-frame";
import { Skeleton } from "@/core/components/ui/skeleton";

import type { PhaseMicroVersion } from "../../lib/version-history.types";
import { PhaseVersionList } from "./phase-version-list";

interface Props {
  pending: boolean;
  error: Error | null;
  items: PhaseMicroVersion[];
  selected: PhaseMicroVersion | undefined;
  onSelect: (version: PhaseMicroVersion) => void;
}

/** Cuerpo del modal de versiones: carga, error, vacío o lista + vista previa. */
export function PhaseVersionBody({ pending, error, items, selected, onSelect }: Readonly<Props>) {
  if (pending)
    return (
      <Skeleton role="status" aria-label="Cargando versiones" className="h-40 w-full rounded-xl" />
    );
  if (error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {error.message}
      </p>
    );
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-1 rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        <p>
          Este recurso aún no tiene versiones guardadas: se guarda una cada vez que editas su código
          HTML.
        </p>
        {/* Regenerar crea una versión nueva del OVA entero, con recursos nuevos: no queda aquí. */}
        <p>
          Lo que cambia la IA al regenerar está en «Historial de versiones», arriba a la derecha.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
      <PhaseVersionList versions={items} selectedId={selected?.id} onSelect={onSelect} />
      {selected ? (
        <HtmlPreviewFrame
          html={selected.content}
          title={`Versión ${String(selected.minor_number)}`}
          height="45vh"
        />
      ) : (
        <p className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Elige una versión para ver cómo era.
        </p>
      )}
    </div>
  );
}
