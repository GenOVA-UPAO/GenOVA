import type { CatalogStatus } from "./catalog-status";
import type { OwnCatalogStatus } from "./own-catalog-status";

/** Si el proveedor de un modelo puede atender ahora mismo, dicho para quien elige. */
export type ProviderConnection = "connected" | "unconnected" | "down" | "unknown";

/**
 * Con clave propia cuenta la lista pedida con esa clave; si no, la de la
 * plataforma. Sin datos (backend antiguo o proveedor sin lista) no se afirma nada.
 */
export function providerConnection(
  platform: CatalogStatus | null | undefined,
  own: OwnCatalogStatus | null | undefined,
  provider: string,
): ProviderConnection {
  const mine = own?.[provider];
  if (mine && mine.state !== "not_connected") return mine.state === "error" ? "down" : "connected";
  const entry = platform?.[provider];
  if (!entry) return "unknown";
  if (entry.configured === false) return "unconnected";
  return entry.ok ? "connected" : "down";
}

export const CONNECTION_LABELS: Record<ProviderConnection, string> = {
  connected: "Conectado",
  unconnected: "Sin conectar",
  down: "Sin respuesta",
  unknown: "",
};

/** Qué pasa si se elige un modelo de un proveedor que no está conectado o no responde. */
export const CONNECTION_HINTS: Partial<Record<ProviderConnection, string>> = {
  unconnected:
    "Este proveedor no tiene clave: la tarea fallará hasta que lo conectes en Credenciales.",
  down: "Este proveedor no respondió en la última comprobación: si falla, se usarán los respaldos.",
};
