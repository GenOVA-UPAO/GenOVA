import { useMatches } from "react-router";

import type { RouteHandle } from "../../router";

/** true en rutas de pantalla completa (workspace, crear): sin padding ni scroll del layout. */
export function useFullBleed(): boolean {
  return useMatches().some((m) => (m.handle as RouteHandle | undefined)?.fullBleed);
}
