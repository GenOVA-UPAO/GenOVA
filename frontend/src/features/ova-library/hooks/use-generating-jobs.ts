import { useQueries, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { HttpError } from "@/core/lib/http";
import { ovaJobsApi } from "@/core/services/ova-jobs-api.service";

import type { JobPollData, OvaJobInfo } from "../lib/job-types";
import type { OvaListItem } from "../lib/types";
import { ovaKeys } from "./use-ova-library";

const POLL_MS = 4000;
const TERMINAL = new Set(["done", "error", "interrupted"]);

function computeProgress(job: JobPollData | null): { done: number; total: number } | null {
  if (!job?.resources?.length) return null;
  const total = job.resources.length;
  const done = job.resources.filter((r) => r.status === "done").length;
  return { done, total };
}

/** Sondea el progreso de jobs para OVAs con estado "generando" mediante TanStack Query. */
export function useGeneratingJobs(ovas: OvaListItem[]) {
  const qc = useQueryClient();
  const generatingOvas = ovas.filter((o) => o.status === "generando");
  const ids = generatingOvas.map((o) => o.id);

  const results = useQueries({
    queries: ids.map((ovaId) => ({
      queryKey: ["ovaJob", ovaId],
      queryFn: async (): Promise<JobPollData | null> => {
        try {
          return (await ovaJobsApi.getJobByOvaId(ovaId)) as JobPollData;
        } catch (err) {
          // Si el job no existe (404), tratamos el OVA como sin job activo
          if (err instanceof HttpError && err.status === 404) return null;
          throw err;
        }
      },
      staleTime: 0,
      refetchInterval: (query: { state: { data?: JobPollData | null } }) => {
        const status = query.state.data?.status;
        return status !== undefined && !TERMINAL.has(status) ? POLL_MS : false;
      },
    })),
  });

  const jobs: Record<string, OvaJobInfo> = {};
  ids.forEach((ovaId, i) => {
    const data = results[i]?.data;
    if (!data) return;
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
