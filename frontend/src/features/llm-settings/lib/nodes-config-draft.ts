type NodeFlags = Record<string, string | number>;

export const NODE_FLAG_DEFAULTS: NodeFlags = {
  ova_images: "1",
  ova_refine: "1",
  ova_critic: "0",
  ova_editor: "0",
  ova_reflection_rounds: 1,
};

export function hasUnsavedChanges(
  draft: NodeFlags | null | undefined,
  serverConfig: NodeFlags | null | undefined,
  rounds: number,
): boolean {
  if (!draft || !serverConfig) return false;
  const serverRounds = serverConfig["ova_reflection_rounds"] ?? 1;
  if (rounds !== serverRounds) return true;
  for (const key of Object.keys(draft)) {
    if (String(draft[key]) !== String(serverConfig[key] ?? NODE_FLAG_DEFAULTS[key] ?? "")) {
      return true;
    }
  }
  return false;
}

export function criticRoundsVisible(draft: { ova_critic?: string } | null | undefined): boolean {
  return draft?.ova_critic === "1";
}
