import { Link } from "react-router";

import { Button } from "@/core/components/ui/button";

import type { useOvaJob } from "../../hooks/use-ova-job";
import { resumableResourceIds } from "../../lib/ova-job-view-model";

export function ProgressActions({ job }: Readonly<{ job: ReturnType<typeof useOvaJob> }>) {
  const ids = resumableResourceIds(job.data);
  return (
    <div className="flex flex-wrap gap-3">
      {!job.outcome.isTerminal && (
        <Button
          variant="outline"
          disabled={job.cancel.isPending}
          onClick={() => {
            job.cancel.mutate();
          }}
        >
          Cancelar generación
        </Button>
      )}
      {job.outcome.isTerminal && ids.length > 0 && !job.outcome.totalFail && (
        <Button
          disabled={job.resume.isPending}
          onClick={() => {
            job.resume.mutate(ids);
          }}
        >
          Reanudar generación
        </Button>
      )}
      {job.data?.ova_id && job.outcome.anyDone && <Link to={`/workspace/${job.data.ova_id}`}>Abrir OVA</Link>}
      <Link to="/mis-ovas">Mis OVAs</Link>
    </div>
  );
}
