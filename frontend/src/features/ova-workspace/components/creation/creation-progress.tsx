import { useEffect } from "react";
import { useNavigate } from "react-router";

import { useFailedSelection } from "../../hooks/use-failed-selection";
import { useJobStall } from "../../hooks/use-job-stall";
import { useOvaJob } from "../../hooks/use-ova-job";
import { statusLabel } from "../../lib/progress-view-model";
import { GenerationProgressColumn } from "./generation-progress-column";
import { ProgressActions } from "./progress-actions";

export function CreationProgress({ jobId, onReady }: Readonly<{ jobId: string; onReady?: () => void }>) {
  const job = useOvaJob(jobId);
  const navigate = useNavigate();
  const ovaId = job.data?.ova_id;
  const done = job.data?.status === "done";
  useEffect(() => {
    if (done && ovaId) {
      if (onReady) onReady();
      else void navigate(`/workspace/${ovaId}`, { replace: true });
    }
  }, [done, ovaId, navigate, onReady]);
  const selection = useFailedSelection(job.resources);
  const stalled = useJobStall(job.data, job.isStreaming);
  const error = job.error ?? job.resume.error ?? job.cancel.error;
  const title = job.outcome.isTerminal
    ? statusLabel(job.data?.status ?? "error")
    : "Generando tu OVA";
  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
      <div className="space-y-3">
        <GenerationProgressColumn
          job={job}
          stalled={stalled}
          selectedIds={selection.selected}
          pinnedId={null}
          onToggle={selection.toggle}
          onSelectAll={selection.selectAll}
          onRetryOne={(id) => {
            job.resume.mutate([id]);
          }}
          onRetrySelected={() => {
            job.resume.mutate(selection.selected);
          }}
          onRetryAll={() => {
            job.resume.mutate([]);
          }}
          onCancel={() => {
            job.cancel.mutate();
          }}
        />
        {error && <p role="alert">{error.message}</p>}
      </div>
      <ProgressActions job={job} />
    </section>
  );
}
