/** Pie del selector: cuántos modelos hay o por qué la lista está vacía. */
export function ModelComboboxFooter({
  shown,
  total,
  query,
}: Readonly<{ shown: number; total: number; query: string }>) {
  const term = query.trim();
  let text = total === 1 ? "1 modelo" : `${String(total)} modelos`;
  if (total === 0 && term === "") text = "No hay modelos activados para esta tarea. Actívalos en «Abrir catálogo».";
  else if (total === 0) text = `Ningún modelo coincide con «${term}».`;
  else if (shown < total) text = `Mostrando ${String(shown)} de ${String(total)}. Escribe para afinar.`;
  return (
    <p role="status" className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
      {text}
    </p>
  );
}
