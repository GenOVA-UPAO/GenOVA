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
  if (pending) return <Skeleton role="status" aria-label="Cargando versiones" className="h-40 w-full rounded-xl" />;
  if (error) return <p role="alert" className="text-sm text-destructive">{error.message}</p>;
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Este recurso aún no tiene versiones anteriores. Aparecerán aquí cuando lo edites o lo regeneres.
      </p>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-[12rem_minmax(0,1fr)]">
      <PhaseVersionList versions={items} selectedId={selected?.id} onSelect={onSelect} />
      {selected ? (
        <HtmlPreviewFrame html={selected.content} title={`Versión ${String(selected.minor_number)}`} height="45vh" />
      ) : (
        <p className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
          Elige una versión para ver cómo era.
        </p>
      )}
    </div>
  );
}
