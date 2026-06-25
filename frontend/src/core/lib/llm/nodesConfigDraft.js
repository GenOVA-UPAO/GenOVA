/**
 * Pure helpers for the PlatformNodesCard draft state.
 * Testable without React or browser.
 */

/** Default flag values matching the backend NODES definitions. */
export const NODE_FLAG_DEFAULTS = {
  ova_images: '1',
  ova_refine: '1',
  ova_critic: '0',
  ova_editor: '0',
  ova_reflection_rounds: 1,
}

/**
 * Return true when draft differs from the original server config or rounds changed.
 */
export function hasUnsavedChanges(draft, serverConfig, rounds) {
  if (!draft || !serverConfig) return false
  const serverRounds = serverConfig.ova_reflection_rounds ?? 1
  if (rounds !== serverRounds) return true
  for (const key of Object.keys(draft)) {
    if (String(draft[key]) !== String(serverConfig[key] ?? NODE_FLAG_DEFAULTS[key] ?? '')) {
      return true
    }
  }
  return false
}

/**
 * Return true when the critic node param (rondas) should be visible:
 * only when the critic flag is '1'.
 */
export function criticRoundsVisible(draft) {
  return draft?.ova_critic === '1'
}

/** VIDEO_RESOURCE_TYPES mirrors backend constant. */
export const VIDEO_RESOURCE_TYPES = { engage: [2], explore: [4], explain: [1] }

/**
 * Return true when a resource id is a video resource for the given phase.
 */
export function isVideoResource(phase, resourceId) {
  return (VIDEO_RESOURCE_TYPES[phase] ?? []).includes(Number(resourceId))
}
