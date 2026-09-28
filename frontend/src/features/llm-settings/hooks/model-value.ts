export function joinModelValue(provider: string | undefined, modelId: string | undefined): string {
  if (!provider || !modelId) return "";
  return `${provider}::${modelId}`;
}

export function splitModelValue(value: string): { provider: string; modelId: string } {
  if (!value) return { provider: "", modelId: "" };
  const sep = value.indexOf("::");
  if (sep < 0) return { provider: "", modelId: "" };
  return { provider: value.slice(0, sep), modelId: value.slice(sep + 2) };
}
