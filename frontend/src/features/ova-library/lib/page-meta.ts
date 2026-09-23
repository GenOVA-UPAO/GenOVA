import type { OvaListPage } from "../api/ova-library.api";
import type { OvaListItem } from "./types";

interface PageMeta {
  ovas: OvaListItem[];
  totalItems: number;
  totalPages: number;
}

/** Normaliza una página del listado (sin datos: lista vacía y una sola página). */
export function pageMeta(data: OvaListPage | undefined): PageMeta {
  return {
    ovas: data?.ovas ?? [],
    totalItems: data?.total_items ?? 0,
    totalPages: Math.max(1, data?.total_pages ?? 1),
  };
}
