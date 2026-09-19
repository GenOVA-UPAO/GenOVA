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
    <div className="space-y-4 rounded-xl border border-border bg-background p-4 shadow-sm sm:p-5">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="font-medium text-foreground">{statusLabel(status)}</span>
          <div className="flex items-center gap-2">
            {!terminal && props.showCancel && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={props.onCancel}
              >
                Cancelar
              </Button>
            )}
            <span className="text-xs font-semibold text-muted-foreground">
              {done}/{String(props.viewModel.length)} listos
            </span>
          </div>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-[width] duration-500 ${failed > 0 ? "bg-accent-brand" : "bg-primary"}`}
            style={{ width: `${String(progressPct(props.viewModel))}%` }}
          />
        </div>
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
            variant="destructive"
            size="sm"
            disabled={props.selectedIds.length === 0}
            onClick={props.onRetrySelected}
          >
            Reintentar seleccionados ({props.selectedIds.length})
          </Button>
        </div>
      )}
    </div>
  );
}
