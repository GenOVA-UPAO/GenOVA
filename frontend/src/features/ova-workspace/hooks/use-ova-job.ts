import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { ovaJobsApi } from "@/core/services/ova-jobs-api.service";

import { cancelOvaJob, fetchOvaJob, resumeOvaJob, startOvaJob } from "../api/ova-jobs.api";
import { failedResourceIds, jobOutcome, type JobSnapshot, toResourceViewModel } from "../lib/ova-job-view-model";
import { OvaJobSyncRunner } from "../services/ova-job-sync";

export const ovaJobKey = (jobId: string) => ["ova-job", jobId] as const;

function invalidateOva(queryClient: ReturnType<typeof useQueryClient>): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: ["ova"] });
}

export function useOvaJob(jobId: string | undefined) {
  const queryClient = useQueryClient();
  const [streaming, setStreaming] = useState(false);
  const snapshotRef = useRef<JobSnapshot | undefined>(undefined);
  const query = useQuery({ queryKey: jobId ? ovaJobKey(jobId) : ["ova-job", "none"], queryFn: () => fetchOvaJob(jobId ?? ""), enabled: Boolean(jobId), refetchInterval: false });
  const streamingRef = useRef(false);

  useEffect(() => {
    snapshotRef.current = query.data;
    streamingRef.current = streaming;
  }, [query.data, streaming]);

  useEffect(() => {
    if (!jobId) return undefined;
    const runner = new OvaJobSyncRunner({
      jobsApi: ovaJobsApi,
      onSnapshot: (snapshot) => queryClient.setQueryData(ovaJobKey(jobId), snapshot),
      onTerminal: () => { void invalidateOva(queryClient); },
      getViewModel: () => toResourceViewModel(snapshotRef.current?.resources),
      isStreaming: () => streamingRef.current,
      setStreaming,
    });
    runner.start(jobId);
    return () => { runner.stop(); };
  }, [jobId, queryClient]);

  const start = useMutation({ mutationFn: startOvaJob, onSuccess: () => { void invalidateOva(queryClient); } });
  const resume = useMutation({ mutationFn: (ids?: string[]) => resumeOvaJob(jobId ?? "", ids), onSuccess: () => queryClient.invalidateQueries({ queryKey: jobId ? ovaJobKey(jobId) : ["ova-job"] }) });
  const cancel = useMutation({ mutationFn: () => cancelOvaJob(jobId ?? ""), onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: jobId ? ovaJobKey(jobId) : ["ova-job"] }); await invalidateOva(queryClient); } });
  const resources = toResourceViewModel(query.data?.resources);

  return { ...query, cancel, failedResourceIds: failedResourceIds(resources), isStreaming: streaming, outcome: jobOutcome(query.data, resources), resources, resume, start };
}
