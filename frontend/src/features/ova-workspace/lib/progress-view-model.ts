import { groupByPhase, type JobLike, type ResourceVM } from "./ova-job-view-model";

const TERMINAL = new Set(["done", "error", "canceled", "interrupted"]);

const STATUS_LABEL: Record<string, string> = {
  queued: "En cola…",
  running: "Generando recursos…",
  interrupted: "Generación interrumpida",
  error: "La generación terminó con errores",
  done: "¡OVA generado!",
  canceled: "Generación cancelada",
};

export function jobStatus(job: JobLike | null | undefined): string {
  return job?.status ?? "queued";
}

export function isTerminalStatus(status: string): boolean {
  return TERMINAL.has(status);
}

export function statusLabel(status: string): string {
  return Object.hasOwn(STATUS_LABEL, status) ? STATUS_LABEL[status] : status;
}

/** Barrido del backend deja el job en `interrupted` con recursos sin terminar. */
export function showResumeBanner(status: string, resumableCount: number): boolean {
  return status === "interrupted" && resumableCount > 0;
}

export function failedCount(viewModel: ResourceVM[] = []): number {
  return viewModel.filter((r) => r.status === "X").length;
}

export function doneCount(viewModel: ResourceVM[] = []): number {
  return viewModel.filter((r) => r.status === "check").length;
}

export function progressPct(viewModel: ResourceVM[] = []): number {
  const total = viewModel.length || 1;
  return Math.round((doneCount(viewModel) / total) * 100);
}

/** Etiqueta de estado para el badge circular de cada recurso. */
export function resourceStatusLabel(status: string): string {
  if (status === "check") return "Generado";
  if (status === "X") return "Error";
  if (status === "generando") return "Generando";
  return "En espera";
}

const MARK_CLS: Record<string, string> = {
  X: "text-destructive border-destructive/40 bg-destructive/10",
  generando: "text-primary border-primary/30 bg-primary/10",
  pendiente: "text-muted-foreground border-border bg-muted/60",
  check: "text-success-strong border-success/40 bg-success/10 dark:text-success",
};

export function markClass(status: string): string {
  return Object.hasOwn(MARK_CLS, status) ? MARK_CLS[status] : MARK_CLS.pendiente;
}

export function phaseGroups(viewModel: ResourceVM[] = []): ReturnType<typeof groupByPhase> {
  return groupByPhase(viewModel);
}
