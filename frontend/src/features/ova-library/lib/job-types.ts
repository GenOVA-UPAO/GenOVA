export interface OvaJobInfo {
  jobId?: string | null;
  status?: string | null;
  progress?: { done: number; total: number } | null;
  isInterrupted?: boolean;
}

export interface JobPollData {
  job_id?: string;
  status?: string;
  resources?: { status: string }[];
}
