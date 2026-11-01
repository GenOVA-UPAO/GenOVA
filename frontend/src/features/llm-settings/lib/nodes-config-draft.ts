type NodeFlags = Partial<Record<string, string | number>>;

export const NODE_FLAG_DEFAULTS: NodeFlags = {
  ova_images: "1",
  ova_refine: "1",
  ova_critic: "0",
  ova_editor: "0",
  ova_reflection_rounds: 1,
};

/**
 * `keys` limita la comparación a los flags de la tarjeta: el borrador es una
 * copia de toda la config y trae también los de Capacidades.
 */
export function hasUnsavedChanges(
  draft: NodeFlags | null | undefined,
  serverConfig: NodeFlags | null | undefined,
  rounds: number,
  keys?: readonly string[],
): boolean {
  if (!draft || !serverConfig) return false;
  const serverRounds = serverConfig.ova_reflection_rounds ?? 1;
  if (rounds !== serverRounds) return true;
  for (const key of keys ?? Object.keys(draft)) {
    if (String(draft[key]) !== String(serverConfig[key] ?? NODE_FLAG_DEFAULTS[key] ?? "")) {
      return true;
    }
  }
  return false;
}

/**
 * Lo que guarda la tarjeta de nodos: solo sus flags y las rondas. Enviar el
 * borrador entero revertía lo guardado entretanto en Capacidades (p. ej.
 * ova_refine), porque el backend mezcla el payload sobre la config.
 */
export function nodesPayload(
  draft: Record<string, string>,
  flags: readonly string[],
  rounds: number,
): Record<string, string> {
  const payload: Record<string, string> = {};
  for (const flag of flags) {
    payload[flag] = draft[flag] ?? String(NODE_FLAG_DEFAULTS[flag] ?? "0");
  }
  payload.ova_reflection_rounds = String(rounds);
  return payload;
}

export function criticRoundsVisible(draft: { ova_critic?: string } | null | undefined): boolean {
  return draft?.ova_critic === "1";
}
