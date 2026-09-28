import { useOvaList } from "./use-ova-library";

/**
 * Totales por estado para las métricas del dashboard. Antes se contaban sobre la
 * primera página (10 OVAs) y «Listas» decía 8 con 73 listas en la biblioteca.
 * Comparte caché con el filtro por estado de Mis OVAs (misma query key).
 */
export function useDashboardCounts() {
  const ready = useOvaList({ page: 1, status: "listo" });
  const active = useOvaList({ page: 1, status: "generando" });
  return {
    ready: ready.data?.total_items,
    active: active.data?.total_items,
  };
}
