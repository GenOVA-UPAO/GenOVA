import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";

import type { useOvaJob } from "../../hooks/use-ova-job";
import { resumableResourceIds } from "../../lib/ova-job-view-model";

function actionState(job: ReturnType<typeof useOvaJob>) {
  const ids = resumableResourceIds(job.data);
  const terminal = job.outcome.isTerminal;
  const canOpen = Boolean(job.data?.ova_id) && job.outcome.anyDone;
  return {
    ids,
    canOpen,
    canResume: terminal && ids.length > 0 && !job.outcome.totalFail,
    canceled: terminal && job.data?.status === "canceled" && !canOpen,
  };
}

/** Acciones de la página de progreso: al terminar, reanudar lo que falta o abrir el OVA. */
export function ProgressActions({ job }: Readonly<{ job: ReturnType<typeof useOvaJob> }>) {
  const { ids, canOpen, canResume, canceled } = actionState(job);
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
      <Button variant="ghost" asChild className="max-sm:h-11">
        <Link to="/mis-ovas">Ir a Mis OVAs</Link>
      </Button>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        {canResume && (
          <Button
            variant={canOpen ? "outline" : "default"}
            className="max-sm:h-11"
            loading={job.resume.isPending}
            onClick={() => {
              job.resume.mutate(ids);
            }}
          >
            Reanudar generación
          </Button>
        )}
        {canceled && (
          <Button asChild className="max-sm:h-11">
            <Link to="/crear">Volver a Crear OVA</Link>
          </Button>
        )}
        {canOpen && (
          <Button asChild className="max-sm:h-11">
            <Link to={`/workspace/${String(job.data?.ova_id)}`}>Abrir OVA</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
