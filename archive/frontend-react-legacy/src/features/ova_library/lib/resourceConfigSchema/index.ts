import { ELABORATE_SCHEMA } from './elaborate'
import { ENGAGE_SCHEMA } from './engage'
import { EVALUATE_SCHEMA } from './evaluate'
import { EXPLAIN_SCHEMA } from './explain'
import { EXPLORE_SCHEMA } from './explore'
import type { ConfigField } from './helpers'

export type { ConfigField } from './helpers'

export const RESOURCE_CONFIG_SCHEMA: Record<string, ConfigField[]> = {
  ...ENGAGE_SCHEMA,
  ...EXPLORE_SCHEMA,
  ...EXPLAIN_SCHEMA,
  ...ELABORATE_SCHEMA,
  ...EVALUATE_SCHEMA,
}

export function getDefaultConfig(
  phaseKey: string,
  resourceId: string,
): Record<string, number> {
  const schema = RESOURCE_CONFIG_SCHEMA[`${phaseKey}:${resourceId}`] ?? []
  return Object.fromEntries(schema.map((f) => [f.key, f.default]))
}

export function getSchema(phaseKey: string, resourceId: string): ConfigField[] {
  return RESOURCE_CONFIG_SCHEMA[`${phaseKey}:${resourceId}`] ?? []
}
