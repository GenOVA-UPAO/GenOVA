import { groupByPhase, type JobEta, type JobLike, type ResourceVM } from "./ova-job-view-model";

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

/**
 * Título de la página de progreso ya terminada. Un job `done` con recursos
 * fallidos no es un «¡OVA generado!»: decirlo así escondía el fallo parcial.
 */
export function terminalTitle(status: string, partialFail: boolean): string {
  if (partialFail && status === "done") return "OVA generado con errores";
  return statusLabel(status);
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

/**
 * Tiempo restante en lenguaje llano y sin falsa precisión: redondea a minutos
 * enteros y avisa cuando la cifra aún es una estimación inicial.
 */
export function formatEta(eta: JobEta | null | undefined): string | null {
  if (!eta) return null;
  const hint = eta.basis === "estimado" ? " (estimación inicial)" : "";
  if (eta.seconds < 20) return `Casi listo${hint}`;
  if (eta.seconds < 60) return `Menos de 1 min restante${hint}`;
  return `≈ ${String(Math.round(eta.seconds / 60))} min restante${hint}`;
}

/** Mensaje para el lector de pantalla al cambiar el estado de un recurso (null si no hay cambio relevante). */
export function announceChange(
  previous: Record<string, string>,
  viewModel: ResourceVM[],
): string | null {
  const messages: string[] = [];
  for (const r of viewModel) {
    if (!Object.hasOwn(previous, r.id) || previous[r.id] === r.status) continue;
    if (r.status === "check") messages.push(`${r.label}: listo`);
    else if (r.status === "X") messages.push(`${r.label}: no se pudo generar`);
    else if (r.status === "generando") messages.push(`${r.label}: generando`);
  }
  return messages.length > 0 ? messages.join(". ") : null;
}
