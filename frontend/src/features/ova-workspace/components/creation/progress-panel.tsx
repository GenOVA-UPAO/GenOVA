import { useEffect, useRef, useState } from "react";

import { Button } from "@/core/components/ui/button";

import type { JobLike, ResourceVM } from "../../lib/ova-job-view-model";
import {
  announceChange,
  doneCount,
  failedCount,
  formatEta,
  isTerminalStatus,
  jobStatus,
  phaseGroups,
  progressPct,
  showResumeBanner,
  statusLabel,
} from "../../lib/progress-view-model";
import { CreationResourceList } from "./creation-resource-list";
import { ProgressBanners } from "./progress-banners";
import { ProgressHeader } from "./progress-header";

interface Props {
  job: JobLike | null | undefined;
  viewModel: ResourceVM[];
  selectedIds: string[];
  activeId: string | null;
  showCancel: boolean;
  isStalled: boolean;
  /** Nº de recursos que faltan (pending/error): 0 oculta la reanudación. */
  resumableCount: number;
  /** True mientras el POST de resume está en vuelo. */
  resuming: boolean;
  /** Selección y reintento en bloque de los fallidos (no aplica al fallo total). */
  allowBulkRetry?: boolean;
  onToggle: (id: string) => void;
  onRetryOne: (id: string) => void;
  onPreview?: (id: string) => void;
  onSelectAll: () => void;
  onRetrySelected: () => void;
  onCancel: () => void;
  onResume: () => void;
}

/** En un job terminado con fallos, cuántos fallaron dice más que repetir el título. */
function headline(status: string, failed: number): string {
  if (!isTerminalStatus(status) || failed === 0) return statusLabel(status);
  return failed === 1
    ? "1 recurso no se pudo generar"
    : `${String(failed)} recursos no se pudieron generar`;
}

/** Región aria-live: anuncia (sin robar el foco) cuando un recurso empieza, termina o falla. */
function useStatusAnnouncement(viewModel: ResourceVM[]): string {
  const previous = useRef<Record<string, string> | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (previous.current) {
      const next = announceChange(previous.current, viewModel);
      if (next) setMessage(next);
    }
    previous.current = Object.fromEntries(viewModel.map((r) => [r.id, r.status]));
  }, [viewModel]);
  return message;
}

export function ProgressPanel(props: Readonly<Props>) {
  const status = jobStatus(props.job);
  const terminal = isTerminalStatus(status);
  const done = doneCount(props.viewModel);
  const failed = failedCount(props.viewModel);
  const announcement = useStatusAnnouncement(props.viewModel);
  const eta = terminal ? null : formatEta(props.job?.eta);
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
      <ProgressHeader
        headline={headline(status, failed)}
        done={done}
        total={props.viewModel.length}
        pct={progressPct(props.viewModel)}
        eta={eta}
        showCancel={!terminal && props.showCancel}
        onCancel={props.onCancel}
      />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <ProgressBanners
        isStalled={props.isStalled}
        showResume={showResumeBanner(status, props.resumableCount)}
        resumableCount={props.resumableCount}
        total={props.viewModel.length}
        resuming={props.resuming}
        showCancel={props.showCancel}
        onResume={props.onResume}
        onCancel={props.onCancel}
      />
      <CreationResourceList
        groups={phaseGroups(props.viewModel)}
        selectedIds={props.selectedIds}
        activeId={props.activeId}
        onToggle={props.onToggle}
        onRetryOne={props.onRetryOne}
        onPreview={props.onPreview}
        selectable={props.allowBulkRetry ?? true}
      />
      {failed > 0 && (props.allowBulkRetry ?? true) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button variant="outline" size="sm" className="max-sm:h-11" onClick={props.onSelectAll}>
            Seleccionar todos los fallidos
          </Button>
          <Button
            size="sm"
            className="max-sm:h-11"
            aria-describedby={props.selectedIds.length === 0 ? "retry-selected-hint" : undefined}
            disabled={props.selectedIds.length === 0}
            onClick={props.onRetrySelected}
          >
            Reintentar seleccionados ({props.selectedIds.length})
          </Button>
          {props.selectedIds.length === 0 && (
            <p id="retry-selected-hint" className="text-xs text-muted-foreground">
              Marca los recursos que quieras reintentar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
