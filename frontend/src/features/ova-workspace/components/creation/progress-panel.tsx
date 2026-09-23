import { Button } from "@/core/components/ui/button";

import type { JobLike, ResourceVM } from "../../lib/ova-job-view-model";
import {
  doneCount,
  failedCount,
  isTerminalStatus,
  jobStatus,
  phaseGroups,
  progressPct,
  showResumeBanner,
  statusLabel,
} from "../../lib/progress-view-model";
import { CreationResourceList } from "./creation-resource-list";
import { ProgressBanners } from "./progress-banners";

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
  onToggle: (id: string) => void;
  onRetryOne: (id: string) => void;
  onPreview?: (id: string) => void;
  onSelectAll: () => void;
  onRetrySelected: () => void;
  onCancel: () => void;
  onResume: () => void;
}

export function ProgressPanel(props: Readonly<Props>) {
  const status = jobStatus(props.job);
  const terminal = isTerminalStatus(status);
  const done = doneCount(props.viewModel);
  const failed = failedCount(props.viewModel);
  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-xs sm:p-5">
      <div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-medium text-foreground">{statusLabel(status)}</span>
          <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
            {done} de {String(props.viewModel.length)} listos
          </span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full w-full origin-left rounded-full transition-transform duration-500 ${failed > 0 ? "bg-accent-brand" : "bg-primary"}`}
            style={{ transform: `scaleX(${String(progressPct(props.viewModel) / 100)})` }}
          />
        </div>
        {!terminal && props.showCancel && (
          <div className="mt-1 flex justify-end">
            <Button variant="ghost" size="xs" className="-mr-2 text-muted-foreground" onClick={props.onCancel}>
              Cancelar generación
            </Button>
          </div>
        )}
      </div>
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
      />
      {failed > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={props.onSelectAll}
          >
            Seleccionar todos los fallidos
          </Button>
          <Button
            size="sm"
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
