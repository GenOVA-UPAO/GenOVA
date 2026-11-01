import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useCurrentUser } from "@/core/auth/auth-store";
import { ovaJobsApi } from "@/core/services/ova-jobs-api.service";

import type { JobPollData, OvaJobInfo } from "../lib/job-types";
import { isOwnOva } from "../lib/ova-card-format";
import type { OvaListItem } from "../lib/types";
import { ovaKeys } from "./use-ova-library";

const POLL_MS = 4000;
// Solo un job en cola o en curso puede avanzar. Cualquier otro estado (terminal,
// o "none" cuando el usuario no tiene job para ese OVA) detiene el sondeo.
const ACTIVE = new Set(["queued", "running"]);

function computeProgress(job: JobPollData | null): { done: number; total: number } | null {
  if (!job?.resources?.length) return null;
  const total = job.resources.length;
  const done = job.resources.filter((r) => r.status === "done").length;
  return { done, total };
}

/** Sondea el progreso de jobs para OVAs con estado "generando" mediante TanStack Query. */
export function useGeneratingJobs(ovas: OvaListItem[]) {
  const qc = useQueryClient();
  const userId = useCurrentUser()?.id;
  // GET /api/jobs?ova_id= solo ve los jobs propios: los OVAs ajenos (alcance
  // "todos" del admin) siempre responderían "none", así que no se sondean.
  const generatingOvas = ovas.filter((o) => o.status === "generando" && isOwnOva(o, userId));
  const ids = generatingOvas.map((o) => o.id);

  const results = useQueries({
    queries: ids.map((ovaId) => ({
      queryKey: ["ovaJob", ovaId],
      queryFn: async (): Promise<JobPollData> =>
        (await ovaJobsApi.getJobByOvaId(ovaId)) as JobPollData,
      staleTime: 0,
      refetchInterval: (query: { state: { data?: JobPollData } }) =>
        ACTIVE.has(query.state.data?.status ?? "") ? POLL_MS : false,
    })),
  });

  const jobs: Record<string, OvaJobInfo> = {};
  ids.forEach((ovaId, i) => {
    const data = results[i]?.data;
    // "none": el OVA no tiene job del usuario; no hay progreso que mostrar.
    if (!data || data.status === "none") return;
    jobs[ovaId] = {
      jobId: data.job_id ?? null,
      status: data.status ?? null,
      progress: computeProgress(data),
      isInterrupted: data.status === "interrupted",
    };
  });

  const resume = useCallback(
    async (ovaId: string) => {
      const data = qc.getQueryData<JobPollData>(["ovaJob", ovaId]);
      if (!data?.job_id) return;
      await ovaJobsApi.resumeJob(data.job_id, []);
      await qc.invalidateQueries({ queryKey: ["ovaJob", ovaId] });
      await qc.invalidateQueries({ queryKey: ovaKeys.all });
    },
    [qc],
  );

  const hasActiveJobs = generatingOvas.length > 0;

  return { jobs, resume, hasActiveJobs };
}
