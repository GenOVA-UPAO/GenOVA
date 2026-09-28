const ROOT = "admin-llm-tools";

/** Claves de consulta de perfiles e historial (solo admin). */
export const modelToolsKeys = {
  all: [ROOT] as const,
  profiles: [ROOT, "profiles"] as const,
  history: [ROOT, "history"] as const,
};
