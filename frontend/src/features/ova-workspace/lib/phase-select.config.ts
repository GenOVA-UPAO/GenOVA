import i18n, { type TFunction } from "i18next";

import { PHASE_ICON_BY_KEY } from "@/core/lib/resource-icons";
import type { Resource } from "@/features/ova-workspace/lib/ova-types";

import { phaseMeta } from "./phase-meta";

export const MAX_PER_PHASE = 4;

export interface PhaseSelectCfg {
  key: string;
  label: string;
  /** Phosphor icon slug (without `ph-` prefix), single source of truth in `PHASE_ICON_BY_KEY`. */
  icon: string;
  sub: string;
  subKey: string;
  color: string;
  bg: string;
}

const mk = (key: string, label: string, sub: string, color: string): PhaseSelectCfg => ({
  key,
  subKey: sub,
  icon: (PHASE_ICON_BY_KEY[key] ?? "ph-circle").replace(/^ph-/, ""),
  get label() { return phaseMeta(key).label || label; },
  get sub() { return i18n.t(sub); },
  color,
  bg: `color-mix(in oklch, ${color} 8%, transparent)`,
});

export const PHASE_SELECT_CFG: PhaseSelectCfg[] = [
  mk("engage", "ENGAGE", "workspace:despierta_la_curiosidad_y_activa_saberes_previos", "#EF4444"),
  mk("explore", "EXPLORE", "workspace:descubre_patrones_y_construye_hipotesis", "#3B82F6"),
  mk("explain", "EXPLAIN", "workspace:formaliza_conceptos_y_consolida_la_teoria", "#F59E0B"),
  mk("elaborate", "ELABORATE", "workspace:aplica_lo_aprendido_a_problemas_reales", "#8B5CF6"),
  mk("evaluate", "EVALUATE", "workspace:verifica_aprendizajes_y_reflexiona_sobre_el_proceso", "#10B981"),
];

export type PhaseResourceMap = Record<string, Resource[]>;
export type ResourceConfigs = Record<string, Record<string, number>>;

export function emptyPicks(): PhaseResourceMap {
  return Object.fromEntries(PHASE_SELECT_CFG.map((p) => [p.key, []]));
}

export function phaseCfg(key: string, t?: TFunction): PhaseSelectCfg | undefined {
  const config = PHASE_SELECT_CFG.find((p) => p.key === key);
  return config && t ? { ...config, label: phaseMeta(key, t).label, sub: t(config.subKey) } : config;
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
