import type { SettingsMap } from '../lib/llmSettingsMutations'
import type { EnabledModel } from './useEnabledModels'

export interface LlmSettingsResponse {
  settings?: SettingsMap
  has_own_llm_key?: boolean
  catalog?: Record<string, unknown[]>
  catalog_all?: unknown[]
  enabled_models?: EnabledModel[]
  defaults?: Record<string, EnabledModel>
  timeout_bounds?: number[]
  catalog_full?: unknown[]
  full_total?: number
  full_page?: number
  full_has_more?: boolean
  categories?: string[]
  types?: string[]
  catalog_status?: unknown
}

export interface LoadOpts {
  append?: boolean
  page?: number
  search?: string
  category?: string
  type?: string
}
