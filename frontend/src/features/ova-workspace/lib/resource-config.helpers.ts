import type { Resource } from "@/core/lib/ova-types";

import { getDefaultConfig } from "./resource-config";

export type ResourceConfigs = Record<string, Record<string, number>>;

export function configKey(phaseKey: string, resourceId: string | number): string {
  return `${phaseKey}:${resourceId}`;
}

export function getConfigForResource(
  configs: ResourceConfigs,
  phaseKey: string,
  resourceId: string | number,
): Record<string, number> {
  return configs[configKey(phaseKey, resourceId)] ?? getDefaultConfig(phaseKey, String(resourceId));
}

export function mergeConfigSave(
  configs: ResourceConfigs,
  phaseKey: string,
  resource: Resource,
  values: Record<string, number>,
): ResourceConfigs {
  return { ...configs, [configKey(phaseKey, resource.id)]: { ...values } };
}
