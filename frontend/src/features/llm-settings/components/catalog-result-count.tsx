import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface ResultCountProps {
  shown: number;
  total: number;
  filtered: boolean;
  onClear: () => void;
}

/** Cuántos modelos se ven y, si hay filtros, cómo quitarlos. */
export function CatalogResultCount({
  shown,
  total,
  filtered,
  onClear,
}: Readonly<ResultCountProps>) {
  const all = total === 1 ? "1 modelo" : `${String(total)} modelos`;
  const text = filtered ? `${String(shown)} de ${String(total)} modelos` : all;
  return (
    <div className="flex min-h-7 items-center justify-between gap-2">
      <p role="status" className="text-xs text-muted-foreground tabular-nums">
        {text}
      </p>
      {filtered ? (
        <Button
          variant="ghost"
          size="xs"
          className="-mr-2 text-muted-foreground max-sm:h-9"
          onClick={onClear}
        >
          <Icon name="x" size="text-xs" />
          Quitar filtros
        </Button>
      ) : null}
    </div>
  );
}
