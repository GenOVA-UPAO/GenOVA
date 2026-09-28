import { apiJson } from "@/core/lib/http";

export interface ResourceConfigsResponse {
  configs?: Record<string, Record<string, number>>;
}

export function fetchResourceConfigs(): Promise<ResourceConfigsResponse> {
  return apiJson("/api/users/me/resource-configs");
}

export function saveResourceConfigs(
  configs: Record<string, Record<string, number>>,
): Promise<ResourceConfigsResponse> {
  return apiJson("/api/users/me/resource-configs", {
    method: "PUT",
    body: JSON.stringify({ configs }),
  });
}
