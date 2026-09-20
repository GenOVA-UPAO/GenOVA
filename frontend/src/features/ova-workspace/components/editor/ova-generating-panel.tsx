import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { fetchOvaJobByOvaId } from "../../api/ova-jobs.api";
import { useFailedSelection } from "../../hooks/use-failed-selection";
import { useJobStall } from "../../hooks/use-job-stall";
import { useOvaJob } from "../../hooks/use-ova-job";
import CrearOvaPreviewPanel from "../creation/crear-ova-preview-panel";
import { GenerationProgressColumn } from "../creation/generation-progress-column";

export function OvaGeneratingPanel({ ovaId, onReady }: Readonly<{ ovaId: string; onReady: () => void }>) {
  const lookup = useQuery({ queryKey: ["ova-job-by-ova", ovaId], queryFn: () => fetchOvaJobByOvaId(ovaId) });
  const job = useOvaJob(lookup.data?.job_id);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const selection = useFailedSelection(job.resources);
  const stalled = useJobStall(job.data, job.isStreaming);
  const readyRef = useRef(false);
  useEffect(() => {
    if (job.outcome.isTerminal && job.outcome.anyDone && !job.outcome.totalFail && !readyRef.current) {
      readyRef.current = true;
      onReady();
    }
  }, [job.outcome, onReady]);
  const resume = (ids: string[]) => {
    job.resume.mutate(ids);
  };
  if (lookup.isPending) return <p role="status" className="p-4">Cargando generación…</p>;
  if (lookup.error)
    return (
      <p role="alert" className="p-4 text-sm text-destructive">
        {lookup.error.message}
      </p>
    );
  if (!lookup.data.job_id)
    return <p className="p-4 text-sm text-destructive">No se encontró la generación de este OVA.</p>;
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex w-full flex-col overflow-hidden border-r border-border/50 bg-card/30 sm:w-[380px] sm:shrink-0">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          <GenerationProgressColumn
            job={job}
            stalled={stalled}
            selectedIds={selection.selected}
            pinnedId={pinnedId}
            onToggle={selection.toggle}
            onSelectAll={selection.selectAll}
            onRetryOne={(id) => {
              resume([id]);
            }}
            onRetrySelected={() => {
              resume(selection.selected);
            }}
            onRetryAll={() => {
              resume([]);
            }}
            onCancel={() => {
              job.cancel.mutate();
            }}
            onPreview={setPinnedId}
          />
        </div>
      </div>
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden bg-muted/10 sm:flex">
        <CrearOvaPreviewPanel jobId={lookup.data.job_id} viewModel={job.resources} pinnedId={pinnedId} onPin={setPinnedId} />
      </div>
    </div>
  );
}
