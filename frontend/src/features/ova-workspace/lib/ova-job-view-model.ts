// HU-022 — pure mapping from a job's backend resources to a UI viewmodel.
// No Angular, no fetch: fully testable in the cucumber-js unit suite.
//
// Backend resource status → UI status:
//   running → 'generando' · error → 'X' · done → 'check' · pending → 'pendiente'
// Anything unknown falls back to 'pendiente'.

export type UiStatus = "pendiente" | "generando" | "check" | "X";

export interface BackendResource {
  id: string | number;
  phase_type: string;
  phase_order: number;
  resource_order: number;
  resource_type?: string | number;
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
};

const PHASE_LABEL: Record<string, string> = {
  engage: "ENGAGE",
  explore: "EXPLORE",
  explain: "EXPLAIN",
  elaborate: "ELABORATE",
  evaluate: "EVALUATE",
};

export function mapResourceStatus(backendStatus: string): UiStatus {
  return STATUS_MAP[backendStatus] || "pendiente";
}

function buildLabelIndex(selections: Selections): Map<string, Partial<SelectionItem>> {
  const index = new Map<string, Partial<SelectionItem>>();
  for (const phase of Object.keys(PHASE_LABEL)) {
    for (const r of selections[phase] || []) {
      index.set(`${phase}:${String(r.id)}`, { tipo: r.tipo, emoji: r.emoji });
    }
  }
  return index;
}

export function toResourceViewModel(
  resources: BackendResource[] = [],
  selections: Selections = {},
): ResourceVM[] {
  const labels = buildLabelIndex(selections);
  return resources
    .slice()
    .sort((a, b) => a.phase_order - b.phase_order || a.resource_order - b.resource_order)
    .map((r) => {
      const phase = r.phase_type;
      const meta = labels.get(`${phase}:${String(r.resource_type)}`) || {};
      const status = mapResourceStatus(r.status);
      return {
        id: String(r.id),
        phase,
        phaseLabel: PHASE_LABEL[phase] || phase,
        label: meta.tipo || `Recurso ${r.resource_type ?? ""}`.trim(),
        emoji: meta.emoji || "",
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
