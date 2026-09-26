import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { phaseMeta } from "../../lib/phase-meta";
import type { PhaseWithContent } from "../../lib/types";

interface Props {
  active: PhaseWithContent | undefined;
  position: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}

const NAV = "max-sm:size-11 max-sm:px-0";

/**
 * Contexto del recurso visible (fase 5E, posición, si se regeneró) y paso al
 * anterior o al siguiente, para recorrer el OVA en el orden en que lo harán
 * los estudiantes sin buscar en las pestañas (que en móvil no caben).
 */
export function WorkspacePreviewFooter({
  active,
  position,
  total,
  onPrevious,
  onNext,
}: Readonly<Props>) {
  if (!active) return null;
  const meta = phaseMeta(active.phase_type);
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2 border-t border-border py-1.5 pr-1.5 pl-3 text-xs text-muted-foreground">
      <span className={`shrink-0 rounded-full border px-2 py-0.5 font-medium ${meta.badge}`}>
        Fase: {meta.label || active.phase_type}
      </span>
      <span className="shrink-0 tabular-nums">
        Recurso {position} de {total}
      </span>
      {active.regenerated && (
        <span className="inline-flex min-w-0 items-center gap-1 font-medium text-foreground">
          <Icon name="sparkle" className="size-3.5 shrink-0 text-accent-brand" />
          <span className="max-sm:sr-only">Regenerado</span>
        </span>
      )}
      {total > 1 && (
        <span className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={NAV}
            aria-label="Recurso anterior"
            disabled={position <= 1}
            onClick={onPrevious}
          >
            <Icon name="caret-left" />
            <span className="max-sm:sr-only">Anterior</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={NAV}
            aria-label="Recurso siguiente"
            disabled={position >= total}
            onClick={onNext}
          >
            <span className="max-sm:sr-only">Siguiente</span>
            <Icon name="caret-right" />
          </Button>
        </span>
      )}
    </div>
  );
}
