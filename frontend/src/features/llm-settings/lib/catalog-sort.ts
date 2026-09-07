import type { CatalogModel } from "./user-llm-settings.types";

/**
 * Orden y agrupación del catálogo completo del modal «Gestionar modelos».
 *
 * Lógica pura (sin componentes, sin store): se testea en catalog-sort.spec.ts.
 *
 * DECISIÓN DE ORDENACIÓN CON PAGINACIÓN: el catálogo llega paginado del
 * servidor (page_size 1000, ~431 modelos hoy ⇒ todo entra en una petición).
 * Así el orden se aplica en cliente sobre el catálogo completo; si el catálogo
 * superase el máximo de la API habría que llevar el orden al servidor antes de
 * volver a paginar para no ordenar una página suelta.
 */

export type SortKey = "default" | "price-asc" | "price-desc" | "name-asc" | "context-desc";
export type GroupKey = "provider" | "type" | "modality";

export interface CatalogSortOption {
  key: SortKey;
  label: string;
}

export const SORT_OPTIONS: CatalogSortOption[] = [
  { key: "default", label: "Orden por defecto" },
  { key: "price-asc", label: "Precio salida ↑" },
  { key: "price-desc", label: "Precio salida ↓" },
  { key: "name-asc", label: "Nombre A-Z" },
  { key: "context-desc", label: "Contexto ↓" },
];

export const GROUP_OPTIONS: { key: "provider" | "type" | "modality"; label: string }[] = [
  { key: "provider", label: "Por proveedor" },
  { key: "type", label: "Por tipo de modelo" },
  { key: "modality", label: "Por modalidad de entrada" },
];

/**
 * Posición de los modelos con `pricing_detail` nulo (Variable, Auto Router,
 * Fusion…): el precio real se desconoce, así que NO compiten en una ranking de
 * precio — van SIEMPRE al final del listado, en asc y en desc. Alfabético
 * secundario para que no queden en orden aleatorio entre sí.
 */
const priceOf = (m: CatalogModel): number | null =>
  m.pricing_detail?.output ?? (m.pricing_detail ? (m.pricing_detail.input ?? null) : null);

export function sortModels(models: CatalogModel[], sortKey: SortKey): CatalogModel[] {
  if (sortKey === "default") return models;
  const sorted = [...models];
  const byName = (a: CatalogModel, b: CatalogModel) =>
    (a.label || a.model_id).localeCompare(b.label || b.model_id, "es");

  if (sortKey === "name-asc") {
    sorted.sort(byName);
    return sorted;
  }

  if (sortKey === "context-desc") {
    // Sin contexto declarado ⇒ el menor posible; empate → A-Z.
    sorted.sort((a, b) => {
      const ca = a.context_length ?? -1;
      const cb = b.context_length ?? -1;
      return cb - ca || byName(a, b);
    });
    return sorted;
  }

  // price-asc / price-desc: sin `pricing_detail` (Variable) → al final siempre,
  // con empate A-Z. En desc el más caro va primero y los Variable quedan tras
  // los conocidos (un precio desconocido no puede encabezar una lista de
  // precios y en desc tampoco compite: saber su coste es imposible hoy).
  sorted.sort((a, b) => {
    const pa = priceOf(a);
    const pb = priceOf(b);
    if (pa === null && pb === null) return byName(a, b);
    if (pa === null) return 1;
    if (pb === null) return -1;
    const delta = sortKey === "price-asc" ? pa - pb : pb - pa;
    return delta || byName(a, b);
  });
  return sorted;
}

/**
 * Cubo de agrupación por modalidad de ENTRADA.
 *
 * Valores reales del backend (`modality`, formato de OpenRouter):
 * "text->text", "text+image->text", "text+image+file+audio+video->text"… La
 * entrada es la parte previa a "->" con tokens separados por "+". Se agrupa
 * por el input más rico en prioridad imagen > video > audio > archivos: un
 * bucket por modelo, sin multiplicar grupos.
 */
export function modalityBucket(modality?: string): string {
  if (!modality) return "otra";
  const input = modality.split("->")[0] ?? "";
  const tokens = new Set(
    input
      .split("+")
      .map((t) => t.trim())
      .filter(Boolean),
  );
  if (!tokens.size) return "otra";
  if (tokens.has("image")) return "imagen";
  if (tokens.has("video")) return "video";
  if (tokens.has("audio")) return "audio";
  if (tokens.has("file")) return "archivos";
  if (tokens.has("text")) return "texto";
  return "otra";
}

export const MODALITY_BUCKET_LABELS: Record<string, string> = {
  texto: "Solo texto",
  imagen: "Acepta imagen",
  video: "Acepta video",
  audio: "Acepta audio",
  archivos: "Acepta archivos",
  otra: "Otra modalidad",
};

const MODALITY_BUCKET_ORDER = ["texto", "imagen", "video", "audio", "archivos", "otra"];

export type GroupBy = "provider" | "type" | "modality";

export interface CatalogGroup {
  key: string;
  label: string;
  models: CatalogModel[];
}

const groupKeyOf = (m: CatalogModel, groupBy: GroupBy): string =>
  groupBy === "provider"
    ? m.provider || "unknown"
    : groupBy === "type"
      ? m.category || "otra"
      : modalityBucket(m.modality);

const sortGroupKeys = (a: CatalogGroup, b: CatalogGroup, groupBy: GroupBy): number => {
  if (groupBy === "modality") {
    const ia = MODALITY_BUCKET_ORDER.indexOf(a.key);
    const ib = MODALITY_BUCKET_ORDER.indexOf(b.key);
    return ia - ib;
  }
  return a.key.localeCompare(b.key, "es");
};

/**
 * Agrupa `models` por el criterio dado. Devuelve lista ORDENADA (no Record)
 * para que la plantilla pinte los grupos en el orden de las etiquetas.
 */
export function groupModels(
  models: CatalogModel[],
  groupBy: GroupBy,
  labels: Record<string, string>,
  preserveModelOrder = false,
): CatalogGroup[] {
  const groups = new Map<string, CatalogModel[]>();
  for (const m of models) {
    const k = groupKeyOf(m, groupBy);
    const list = groups.get(k);
    if (list) list.push(m);
    else groups.set(k, [m]);
  }

  const grouped = [...groups.entries()].map(([key, models]) => ({
    key,
    label: (groupBy === "modality" ? MODALITY_BUCKET_LABELS[key] : null) || labels[key] || key,
    models,
  }));
  return preserveModelOrder ? grouped : grouped.sort((a, b) => sortGroupKeys(a, b, groupBy));
}
