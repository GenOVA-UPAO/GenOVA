import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { ConfirmModal } from "@/core/components/confirm-modal";

import { useFailedSelection } from "../../hooks/use-failed-selection";
import { useJobStall } from "../../hooks/use-job-stall";
import { useOvaJob } from "../../hooks/use-ova-job";
import { failedCount, terminalTitle } from "../../lib/progress-view-model";
import { GenerationProgressColumn } from "./generation-progress-column";
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
    <section className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">{title}</h1>
        <p className="mt-1.5 text-sm font-medium text-muted-foreground">{subtitle(job)}</p>
      </header>
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
            setConfirmingCancel(true);
          }}
        />
        {confirmingCancel && (
          <ConfirmModal
            title="¿Cancelar la generación?"
            message="Los recursos que aún no se generaron no se crearán. Podrás reintentarlos desde Mis OVAs."
            confirmLabel="Cancelar generación"
            loadingLabel="Cancelando…"
            isLoading={job.cancel.isPending}
            onConfirm={() => {
              job.cancel.mutate(undefined, {
                onSettled: () => {
                  setConfirmingCancel(false);
                },
              });
            }}
            onCancel={() => {
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
      <ProgressActions job={job} />
    </section>
  );
}
