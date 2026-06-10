// Workspace split panel utilities (HU-025). Pure, no React imports.

const STORAGE_KEY = 'workspace-split-ratio'
export const SPLIT_MIN = 0.25   // left panel ≥ ~300px at 1200px viewport
export const SPLIT_MAX = 0.65   // right panel always gets ≥ 35%

export function getSavedRatio(defaultRatio = 0.4) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const v = parseFloat(saved)
      if (v >= SPLIT_MIN && v <= SPLIT_MAX) return v
    }
  } catch {
    // localStorage unavailable (SSR / private browsing)
  }
  return defaultRatio
}

export function saveSplitRatio(ratio) {
  try {
    localStorage.setItem(STORAGE_KEY, String(ratio))
  } catch {
    // ignore
  }
}
