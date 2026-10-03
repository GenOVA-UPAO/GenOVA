import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { useFailedSelection } from "../../hooks/use-failed-selection";
import { useJobStall } from "../../hooks/use-job-stall";
import { useOvaJob } from "../../hooks/use-ova-job";
import { failedCount, terminalTitle } from "../../lib/progress-view-model";
import { CancelGenerationModal } from "./cancel-generation-modal";
import { GenerationProgressColumn } from "./generation-progress-column";
import { PreviewAside } from "./preview-aside";
import { ProgressActions } from "./progress-actions";

function subtitle(job: ReturnType<typeof useOvaJob>): string {
  if (!job.outcome.isTerminal) {
    return "Puedes salir de esta página: la generación continúa y el OVA aparecerá en Mis OVAs.";
  }
  if (!job.outcome.partialFail) return "Revisa el resultado de cada recurso.";
  const failed = failedCount(job.resources);
  const total = String(job.resources.length);
  const lead =
    failed === 1
      ? `1 de ${total} recursos no se pudo generar.`
      : `${String(failed)} de ${total} recursos no se pudieron generar.`;
  return `${lead} Reintenta los fallidos o abre el OVA con lo que sí se generó.`;
}

export function CreationProgress({
  jobId,
  onReady,
}: Readonly<{ jobId: string; onReady?: () => void }>) {
  const job = useOvaJob(jobId);
  const navigate = useNavigate();
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const ovaId = job.data?.ova_id;
  // Con algún recurso fallido el backend también marca el job `done`: saltar al
  // editor escondería el fallo y el reintento, así que se queda en el progreso.
  const ready = job.data?.status === "done" && !job.outcome.partialFail;
  useEffect(() => {
    if (ready && ovaId) {
      if (onReady) onReady();
      else void navigate(`/workspace/${ovaId}`, { replace: true });
    }
  }, [ready, ovaId, navigate, onReady]);
  const selection = useFailedSelection(job.resources);
  const stalled = useJobStall(job.data, job.isStreaming);
  // El error de carga del job ya lo muestra la columna; aquí solo los de las acciones.
  const error = job.resume.error ?? job.cancel.error;
  const title = job.outcome.isTerminal
    ? terminalTitle(job.data?.status ?? "error", job.outcome.partialFail)
    : "Generando tu OVA";
  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mt-1.5 text-sm font-medium text-muted-foreground">{subtitle(job)}</p>
      </header>
      <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div className="min-w-0 space-y-3">
        <GenerationProgressColumn
          job={job}
          stalled={stalled}
          selectedIds={selection.selected}
          pinnedId={pinnedId}
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
            setConfirmingCancel(true);
          }}
          onPreview={setPinnedId}
        />
        {confirmingCancel && (
          <CancelGenerationModal
            cancel={job.cancel}
            onClose={() => {
              setConfirmingCancel(false);
            }}
          />
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error.message}
          </p>
        )}
      </div>
        <PreviewAside
          jobId={jobId}
          resources={job.resources}
          pinnedId={pinnedId}
          onPin={setPinnedId}
        />
      </div>
      <ProgressActions job={job} />
    </section>
  );
}
