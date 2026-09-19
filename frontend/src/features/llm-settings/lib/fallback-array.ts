export function moveIn<T>(arr: readonly T[], i: number, dir: number): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return [...arr];
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function addEmpty<T>(arr: readonly T[], factory: () => T): T[] {
  return [...arr, factory()];
}

export function removeAt<T>(arr: readonly T[], i: number): T[] {
  return arr.filter((_, j) => j !== i);
}

export function setAt<T extends object>(arr: readonly T[], i: number, patch: Partial<T>): T[] {
  return arr.map((el, j) => (j === i ? { ...el, ...patch } : el));
}
