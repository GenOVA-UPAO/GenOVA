/** Spanish list join: "A y B" / "A, B y C". */
export function joinList(items: readonly string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  const head = items.slice(0, -1).join(", ");
  return `${head} y ${items[items.length - 1]}`;
}
