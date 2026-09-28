import type { useOvaJob } from "../../hooks/use-ova-job";
import { isResumableJob } from "../../lib/ova-job-view-model";
import { CanceledJobBanner } from "./canceled-job-banner";
import { ProgressPanel } from "./progress-panel";
import { TotalFailurePanel } from "./total-failure-panel";

interface Props {
  job: ReturnType<typeof useOvaJob>;
  stalled: boolean;
  selectedIds: string[];
  pinnedId: string | null;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onRetryOne: (id: string) => void;
  onRetrySelected: () => void;
  onRetryAll: () => void;
  onCancel: () => void;
  onPreview?: (id: string) => void;
}

/** Pendientes + fallidos: lo que el backend reintentará al reanudar. 0 = no reanudable. */
function resumableCount(job: ReturnType<typeof useOvaJob>): number {
  const snapshot = job.data;
  if (!isResumableJob(snapshot, snapshot?.resources ?? [])) return 0;
  return job.resources.filter(
    (resource) => resource.status === "pendiente" || resource.status === "X",
  ).length;
}

/** Fija el recurso marcado si sigue generado; si no, el primero completado. */
function activePreviewId(
  job: ReturnType<typeof useOvaJob>,
  pinnedId: string | null,
): string | null {
  const pinnedDone = job.resources.some(
    (resource) => resource.id === pinnedId && resource.status === "check",
  );
  if (pinnedDone) return pinnedId;
  return job.resources.find((resource) => resource.status === "check")?.id ?? null;
}

function outcomeKind(
  outcome: ReturnType<typeof useOvaJob>["outcome"],
  status: string | undefined,
): "canceled" | "totalFail" | null {
  if (!outcome.isTerminal) return null;
  if (status === "canceled") return "canceled";
  return outcome.totalFail ? "totalFail" : null;
}

export function GenerationProgressColumn({
  job,
  stalled,
  selectedIds,
  pinnedId,
  onToggle,
  onSelectAll,
  onRetryOne,
  onRetrySelected,
  onRetryAll,
  onCancel,
  onPreview,
}: Readonly<Props>) {
  const activeId = activePreviewId(job, pinnedId);
  const outcome = job.outcome;
  const resumable = resumableCount(job);
  const kind = outcomeKind(outcome, job.data?.status);
  return (
    <>
      {!outcome.isTerminal && job.resources.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          Iniciando generación…
        </p>
      )}
      {kind === "canceled" && <CanceledJobBanner />}
      {kind === "totalFail" && (
        <TotalFailurePanel viewModel={job.resources} onRetryAll={onRetryAll} />
      )}
      {job.resources.length > 0 && (
        <ProgressPanel
          job={job.data}
          viewModel={job.resources}
          selectedIds={selectedIds}
          activeId={activeId}
          showCancel={!outcome.isTerminal}
          isStalled={stalled}
          resumableCount={resumable}
          resuming={job.resume.isPending}
          allowBulkRetry={kind !== "totalFail"}
          onToggle={onToggle}
          onRetryOne={onRetryOne}
          onPreview={onPreview}
          onSelectAll={onSelectAll}
          onRetrySelected={onRetrySelected}
          onCancel={onCancel}
          onResume={onRetryAll}
        />
      )}
      {job.error && <p className="text-xs text-destructive">{job.error.message}</p>}
    </>
  );
}
