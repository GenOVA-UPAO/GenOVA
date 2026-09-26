import { Button } from "@/core/components/ui/button";

interface ModelComboboxFooterProps {
  shown: number;
  total: number;
  query: string;
  filtered: boolean;
  /** Qué significan los precios de la lista (tokens, imagen o segundo de video). */
  priceNote?: string;
  onClearFilters: () => void;
}

export const TOKEN_PRICE_NOTE = "Precio por millón de tokens: entrada / salida.";

/** Pie del selector: cuántos modelos hay, qué significan los precios o por qué la lista está vacía. */
export function ModelComboboxFooter({
  shown,
  total,
  query,
  filtered,
  priceNote = TOKEN_PRICE_NOTE,
  onClearFilters,
}: Readonly<ModelComboboxFooterProps>) {
  const term = query.trim();
  let text = `${countLabel(total)}. ${priceNote}`;
  if (total === 0) text = "No hay modelos disponibles para esta tarea. Conecta un proveedor en Credenciales.";
  else if (shown === 0 && term !== "") text = `Ningún modelo coincide con «${term}».`;
  else if (shown === 0) text = "Ningún modelo cumple esos filtros.";
  else if (filtered) text = `${String(shown)} de ${countLabel(total)}. ${priceNote}`;
  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-border px-3 py-2">
      <p role="status" className="min-w-0 flex-1 text-xs text-muted-foreground">
        {text}
      </p>
      {shown === 0 && total > 0 ? (
        <Button variant="ghost" size="xs" className="shrink-0 max-sm:h-9" onClick={onClearFilters}>
          Quitar filtros
        </Button>
      ) : null}
    </div>
  );
}

function countLabel(total: number): string {
  return total === 1 ? "1 modelo" : `${String(total)} modelos`;
}
