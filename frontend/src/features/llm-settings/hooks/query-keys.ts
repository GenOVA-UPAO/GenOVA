export const llmSettingsKeys = {
  all: ["llm-settings"] as const,
  list: (params: { search: string; category: string; type: string }) =>
    [...llmSettingsKeys.all, "list", params] as const,
  apiKeys: ["llm-settings", "api-keys"] as const,
};

export const adminLlmKeys = {
  config: ["admin-llm-config"] as const,
  nodes: ["admin-nodes-config"] as const,
  guardrails: ["admin-guardrails"] as const,
};
