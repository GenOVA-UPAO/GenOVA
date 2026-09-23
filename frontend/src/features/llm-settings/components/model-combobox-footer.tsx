/** Pie del selector: cuántos modelos hay o por qué la lista está vacía. */
export function ModelComboboxFooter({
  shown,
  total,
  query,
}: Readonly<{ shown: number; total: number; query: string }>) {
  let text = `${String(total)} modelos`;
  if (total === 0) text = `Ningún modelo coincide con «${query.trim()}».`;
  else if (shown < total) text = `Mostrando ${String(shown)} de ${String(total)}. Escribe para afinar.`;
  return (
    <p role="status" className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
      {text}
    </p>
  );
}
