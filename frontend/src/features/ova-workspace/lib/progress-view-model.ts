import i18n, { type TFunction } from "i18next";

import { groupByPhase, type JobEta, type JobLike, type ResourceVM } from "./ova-job-view-model";

const TERMINAL = new Set(["done", "error", "canceled", "interrupted"]);

const STATUS_LABEL: Record<string, string> = {
  queued: "workspace:en_cola_683",
  running: "workspace:generando_recursos",
  interrupted: "workspace:generacion_interrumpida",
  error: "workspace:la_generacion_termino_con_errores",
  done: "workspace:ova_generado",
  canceled: "workspace:generacion_cancelada",
};

export function jobStatus(job: JobLike | null | undefined): string {
  return job?.status ?? "queued";
}

export function isTerminalStatus(status: string): boolean {
  return TERMINAL.has(status);
}

export function statusLabel(status: string, t: TFunction = i18n.t): string {
  return Object.hasOwn(STATUS_LABEL, status) ? t(STATUS_LABEL[status]) : status;
}

/**
 * Título de la página de progreso ya terminada. Un job `done` con recursos
 * fallidos no es un «¡OVA generado!»: decirlo así escondía el fallo parcial.
 */
export function terminalTitle(status: string, partialFail: boolean, t: TFunction = i18n.t): string {
  if (partialFail && status === "done") return t("workspace:ova_generado_con_errores");
  return statusLabel(status, t);
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
export function resourceStatusLabel(status: string, t: TFunction = i18n.t): string {
  if (status === "check") return t("workspace:generado");
  if (status === "X") return t("workspace:error");
  if (status === "generando") return t("workspace:generando_691");
  if (status === "cancelado") return t("workspace:resourceCanceled");
  return t("workspace:en_cola");
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
export function formatEta(eta: JobEta | null | undefined, t: TFunction = i18n.t): string | null {
  if (!eta) return null;
  const hint = eta.basis === "estimado" ? t("workspace:estimacion_inicial") : "";
  if (eta.seconds < 20) return t("workspace:casi_listovalue", { p0: hint });
  if (eta.seconds < 60) return t("workspace:menos_de_1_min_restantevalue", { p0: hint });
  return t("workspace:value_min_restantevalue", { p0: String(Math.round(eta.seconds / 60)), p1: hint });
}

/** Mensaje para el lector de pantalla al cambiar el estado de un recurso (null si no hay cambio relevante). */
export function announceChange(
  previous: Record<string, string>,
  viewModel: ResourceVM[],
): string | null {
  const messages: string[] = [];
  for (const r of viewModel) {
    if (!Object.hasOwn(previous, r.id) || previous[r.id] === r.status) continue;
    if (r.status === "check") messages.push(i18n.t("workspace:value_listo", { p0: r.label }));
    else if (r.status === "X") messages.push(i18n.t("workspace:value_no_se_pudo_generar", { p0: r.label }));
    else if (r.status === "generando") messages.push(i18n.t("workspace:value_generando", { p0: r.label }));
  }
  return messages.length > 0 ? messages.join(". ") : null;
}
