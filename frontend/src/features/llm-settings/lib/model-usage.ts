import { type Draft, type EffectiveConfig, toDraft } from "./llm-config-draft";
import { taskMeta } from "./task-meta";

/** Hueco de la cadena que se está editando: `index` -1 es el modelo principal. */
export interface ChainSlot {
  task: string;
  index: number;
}

const keyOf = (provider: string, modelId: string) => `${provider}::${modelId}`;

/**
 * Dónde se usa cada modelo en la configuración, por clave `proveedor::id`:
 * «Texto» si es el principal, «Código / HTML (respaldo)» si es un respaldo.
 * Se omite el hueco que se está editando: ahí ya se ve como elegido.
 */
export function modelUsage(
  draft: Draft | null | undefined,
  tasks: readonly string[],
  skip?: ChainSlot,
): Record<string, string[]> {
  const usage: Record<string, string[]> = {};
  const add = (provider: string, modelId: string, label: string) => {
    if (!provider || !modelId) return;
    const key = keyOf(provider, modelId);
    const list = (usage[key] ??= []);
    if (!list.includes(label)) list.push(label);
  };
  for (const task of tasks) {
    const chain = draft?.[task];
    if (!chain) continue;
    const label = taskMeta(task).label;
    if (!(skip?.task === task && skip.index === -1)) {
      add(chain.default.provider, chain.default.model_id, label);
    }
    chain.fallbacks.forEach((entry, index) => {
      if (skip?.task === task && skip.index === index) return;
      add(entry.provider, entry.model_id, `${label} (respaldo)`);
    });
  }
  return usage;
}

/** «Texto», «Texto y Código / HTML», «Texto, Código / HTML y 2 más». */
export function usageSummary(labels: readonly string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  if (labels.length === 2) return `${labels[0]} y ${labels[1]}`;
  return `${labels[0]}, ${labels[1]} y ${String(labels.length - 2)} más`;
}

/** Uso según una configuración guardada (la de la plataforma), sin borrador delante. */
export function configUsage(config: EffectiveConfig | null | undefined): Record<string, string[]> {
  if (!config) return {};
  const tasks = [
    ...new Set([...Object.keys(config.defaults ?? {}), ...Object.keys(config.fallbacks ?? {})]),
  ];
  return modelUsage(toDraft(config, tasks), tasks);
}
