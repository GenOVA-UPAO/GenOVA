// HU-022 — pure mapping from a job's backend resources to a UI viewmodel.
// No Angular, no fetch: fully testable in the cucumber-js unit suite.
//
// Backend resource status → UI status:
//   running → 'generando' · error → 'X' · done → 'check' · pending → 'pendiente'
// Anything unknown falls back to 'pendiente'.

import { phaseMeta } from "./phase-meta";

export type UiStatus = "pendiente" | "generando" | "check" | "X";

export interface BackendResource {
  id: string | number;
  phase_type: string;
  phase_order: number;
  resource_order: number;
  resource_type?: string | number;
  /** Título del catálogo (backend); evita labels genéricos e iconos rotos. */
  title?: string | null;
  emoji?: string | null;
  status: string;
  error_id?: string | null;
}

export interface SelectionItem {
  id: string | number;
  tipo?: string;
  emoji?: string;
}
export type Selections = Record<string, SelectionItem[]>;

export interface ResourceVM {
  id: string;
  phase: string;
  phaseLabel: string;
  label: string;
  emoji: string;
  status: UiStatus;
  error_id: string | null;
  selectable: boolean;
}

export interface PhaseGroup {
  phase: string;
  phaseLabel: string;
  items: ResourceVM[];
}

export interface JobLike {
  status?: string;
  updated_at?: string;
}

export interface JobSnapshot extends JobLike {
  resources?: BackendResource[];
}

export interface JobOutcome {
  isTerminal: boolean;
  anyDone: boolean;
  totalFail: boolean;
}

const STATUS_MAP: Record<string, UiStatus> = {
  pending: "pendiente",
  running: "generando",
  done: "check",
  error: "X",
  // Se generó contenido pero no pasó el validador. Sin esta entrada caería al
  // "pendiente" por defecto y se pintaría como si aún faltara por generar,
  // ocultando que salió defectuoso.
  degraded: "X",
};

export function mapResourceStatus(backendStatus: string): UiStatus {
  return STATUS_MAP[backendStatus] || "pendiente";
}

/**
 * GN-01/GN-02: cuando la selección original ya no está disponible (job
 * restaurado/refrescado), `resource_type` es lo único que queda. Suele ser un
 * id numérico ("3") — sin texto que humanizar, devuelve "" — o un slug/nombre
 * ("comic_interactivo", "Lectura Interactiva") que se normaliza a Title Case.
 */
export function humanizeResourceType(raw: string | number | null | undefined): string {
  const s = String(raw ?? "").trim();
  if (!s || /^\d+$/.test(s)) return "";
  return s
    .replace(/[_-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

const PHASES = ["engage", "explore", "explain", "elaborate", "evaluate"];

function buildLabelIndex(selections: Selections): Map<string, Partial<SelectionItem>> {
  const index = new Map<string, Partial<SelectionItem>>();
  for (const phase of PHASES) {
    for (const r of selections[phase] || []) {
      index.set(`${phase}:${String(r.id)}`, { tipo: r.tipo, emoji: r.emoji });
    }
  }
  return index;
}

/** Etiqueta cuando no hay catálogo ni tipo humanizable.
 * `resource_order` es por fase: sin el nombre de fase, dos "Recurso 1" colisionan. */
function fallbackResourceLabel(phase: string, resourceOrder: number): string {
  const phaseLabel = phaseMeta(phase).label || phase;
  return `${phaseLabel} · ${resourceOrder + 1}`;
}

export function toResourceViewModel(
  resources: BackendResource[] = [],
  selections: Selections = {},
): ResourceVM[] {
  const labels = buildLabelIndex(selections);
  const seen = new Map<string, number>();
  return resources
    .slice()
    .sort((a, b) => a.phase_order - b.phase_order || a.resource_order - b.resource_order)
    .map((r) => {
      const phase = r.phase_type;
      const meta = labels.get(`${phase}:${String(r.resource_type)}`) || {};
      const status = mapResourceStatus(r.status);
      const catalogTitle = (r.title ?? "").trim();
      const humanized = humanizeResourceType(r.resource_type);
      const base =
        meta.tipo?.trim() ||
        catalogTitle ||
        humanized ||
        fallbackResourceLabel(phase, r.resource_order);
      const count = (seen.get(base) ?? 0) + 1;
      seen.set(base, count);
      return {
        id: String(r.id),
        phase,
        phaseLabel: phaseMeta(phase).label || phase,
        label: count > 1 ? `${base} (${count})` : base,
        emoji: meta.emoji || r.emoji || "",
        status,
        error_id: r.error_id || null,
        selectable: status === "X",
      };
    });
}

export function failedResourceIds(viewModel: ResourceVM[] = []): string[] {
  return viewModel.filter((r) => r.status === "X").map((r) => r.id);
}

export function pruneSelection(selectedIds: string[] = [], viewModel: ResourceVM[] = []): string[] {
  const failed = new Set(failedResourceIds(viewModel));
  return selectedIds.filter((id) => failed.has(id));
}

export function groupByPhase(viewModel: ResourceVM[] = []): PhaseGroup[] {
  const groups = new Map<string, PhaseGroup>();
  for (const r of viewModel) {
    if (!groups.has(r.phase)) {
      groups.set(r.phase, {
        phase: r.phase,
        phaseLabel: r.phaseLabel,
        items: [],
      });
    }
    groups.get(r.phase)?.items.push(r);
  }
  return Array.from(groups.values());
}

const TERMINAL = new Set(["done", "error", "interrupted", "canceled"]);

/** 3 min sin cambios de estado en `running` dispara el aviso de estancamiento (WS-02/CR-01). */
export const STALL_MS = 3 * 60 * 1000;

/**
 * Estados de recurso que el backend reintentará al reanudar: espejo de
 * `_RESUMABLE_RESOURCE_STATUSES` en `jobs_service.py`. Lo ya "done" se
 * conserva; las filas nunca quedan en "running" (el grafo solo escribe
 * done/error/degraded por recurso), así que tras una caída a media generación
 * todo lo no terminado es exactamente lo reanudable.
 *
 * `degraded` = se generó HTML pero no pasó el validador. Se conserva el
 * contenido y el motivo (`defect_reason`), pero NO cuenta como terminado: es
 * justo el caso que este botón existe para rescatar. Si se añade un estado
 * nuevo en `jobs_service.py`, hay que añadirlo aquí o el botón no aparecerá.
 */
export const RESUMABLE_RESOURCE_STATUSES = new Set(["pending", "error", "degraded"]);

export function resumableResourceIds(snapshot: JobSnapshot | null | undefined): string[] {
  if (!snapshot) return [];
  return (snapshot.resources || [])
    .filter((r) => RESUMABLE_RESOURCE_STATUSES.has(r.status))
    .map((r) => String(r.id));
}

/**
 * ¿Este job es candidato al botón «Reanudar generación»?
 *
 * Solo el estado `interrupted` (lo marca el barrido cuando el hilo muere a
 * media generación) ofrece reanudar desde cero: `running` tiene su propio aviso
 * de estancamiento, y `error`/`done` ya tienen sus CTA de reintento propios.
 * Sin recursos pendientes ni fallidos el botón no haría nada (el backend
 * respondería `resumed: 0`), así que no se ofrece.
 */
export function isResumableJob(
  job: JobLike | null | undefined,
  resources: BackendResource[] = [],
): boolean {
  if (job?.status !== "interrupted") return false;
  return resources.some((r) => RESUMABLE_RESOURCE_STATUSES.has(r.status));
}

/**
 * Huella barata de un snapshot para detectar progreso real entre polls: el
 * status del job + el status de cada recurso. `updated_at` del job NO sirve
 * solo — el backend únicamente lo toca en transiciones de job (running →
 * done/error/interrupted), no en cada avance de recurso.
 */
export function resourcesFingerprint(snapshot: JobSnapshot | null | undefined): string {
  if (!snapshot) return "";
  const parts = (snapshot.resources || []).map((r) => `${r.id}:${r.status}`);
  return `${snapshot.status ?? ""}|${parts.join(",")}`;
}

export function jobOutcome(
  job: JobLike | null | undefined,
  viewModel: ResourceVM[] = [],
): JobOutcome {
  const status = job?.status || "queued";
  const anyDone = viewModel.some((r) => r.status === "check");
  return {
    isTerminal: TERMINAL.has(status),
    anyDone,
    totalFail: TERMINAL.has(status) && !anyDone,
  };
}
