const STORAGE_KEY = "workspace-split-ratio";
export const SPLIT_MIN = 0.25;
export const SPLIT_MAX = 0.65;

export function clampRatio(r: number): number {
  return Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, r));
}

export function getSavedRatio(defaultRatio = 0.4): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const v = Number.parseFloat(saved);
      if (v >= SPLIT_MIN && v <= SPLIT_MAX) return v;
    }
  } catch {
    // ignore
  }
  return defaultRatio;
}

export function saveSplitRatio(ratio: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(ratio));
  } catch {
    // ignore
  }
}
