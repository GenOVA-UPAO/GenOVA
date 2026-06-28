import {
  getAdminNodesConfig,
  saveAdminNodesConfig,
} from '../services/adminSettingsService'
import { createAdminConfigHook } from './createAdminConfigHook'

/**
 * Admin config for Prometheus nodes/agents.
 * Provides node definitions, current flag values, and a save mutation.
 */
export const useAdminNodesConfig = createAdminConfigHook(
  ['admin', 'nodes-config'],
  getAdminNodesConfig,
  saveAdminNodesConfig,
)
