import { Button } from "@/core/components/ui/button";

interface ManageModelsEmptyProps {
  kind: "keys" | "filters";
  onAddKey: () => void;
  onClearFilters: () => void;
}

export function ManageModelsEmpty({ kind, onAddKey, onClearFilters }: Readonly<ManageModelsEmptyProps>) {
  if (kind === "keys") {
    return (
      <div className="flex flex-col items-center gap-4 px-8 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-xl shadow-sm">
          🔑
        </div>
        <div className="max-w-xs space-y-1.5">
          <p className="font-display text-sm font-bold text-foreground">Sin API keys configuradas</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Añade una API key para ver y activar modelos.
          </p>
        </div>
        <Button size="sm" onClick={onAddKey} className="gap-1.5 text-xs font-bold">
          🔑 Añadir API Key
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 px-8 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card text-xl shadow-sm">
        🔎
      </div>
      <p className="font-display text-sm font-bold text-foreground">Ningún modelo con estos filtros</p>
      <p className="text-xs text-muted-foreground">Prueba con otro tipo, categoría o búsqueda.</p>
      <Button size="sm" variant="outline" onClick={onClearFilters} className="text-xs font-bold">
        Limpiar filtros
      </Button>
    </div>
  );
}
