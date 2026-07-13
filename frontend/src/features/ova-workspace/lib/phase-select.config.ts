import type { Resource } from "@/core/lib/ova-types";

import { PHASE_ICON_BY_KEY } from "./resource-icons";

export const MAX_PER_PHASE = 4;

export interface PhaseSelectCfg {
  key: string;
  label: string;
  /** Phosphor icon slug (without `ph-` prefix), single source of truth in `PHASE_ICON_BY_KEY`. */
  icon: string;
  sub: string;
  color: string;
  bg: string;
}

const mk = (key: string, label: string, sub: string, color: string): PhaseSelectCfg => ({
  key,
  icon: (PHASE_ICON_BY_KEY[key] ?? "ph-circle").replace(/^ph-/, ""),
  label,
  sub,
  color,
  bg: `color-mix(in oklch, ${color} 8%, transparent)`,
});

export const PHASE_SELECT_CFG: PhaseSelectCfg[] = [
  mk("engage", "ENGAGE", "Despierta curiosidad · activa saberes previos", "#EF4444"),
  mk("explore", "EXPLORE", "Descubre patrones · construye hipótesis", "#3B82F6"),
  mk("explain", "EXPLAIN", "Formaliza conceptos · consolida la teoría", "#F59E0B"),
  mk("elaborate", "ELABORATE", "Aplica · transfiere a problemas reales", "#8B5CF6"),
  mk("evaluate", "EVALUATE", "Verifica aprendizajes · reflexiona el proceso", "#10B981"),
];

export type PhaseResourceMap = Record<string, Resource[]>;
export type ResourceConfigs = Record<string, Record<string, number>>;

export function emptyPicks(): PhaseResourceMap {
  return Object.fromEntries(PHASE_SELECT_CFG.map((p) => [p.key, []]));
}

export function phaseCfg(key: string): PhaseSelectCfg | undefined {
  return PHASE_SELECT_CFG.find((p) => p.key === key);
}

export function toggleSelection(list: Resource[], resource: Resource): Resource[] {
  const idx = list.findIndex((r) => String(r.id) === String(resource.id));
  if (idx >= 0) return list.filter((_, i) => i !== idx);
  if (list.length >= MAX_PER_PHASE) return list;
  return [...list, resource];
}

/** Recursos por fase que generan video (requieren API key de video configurada). */
export const VIDEO_RESOURCE_TYPES: Record<string, number[]> = {
  engage: [2],
  explore: [4],
  explain: [1],
};

export function isVideoResource(phase: string, resourceId: string | number): boolean {
  return (VIDEO_RESOURCE_TYPES[phase] ?? []).includes(Number(resourceId));
}
