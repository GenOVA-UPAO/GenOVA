import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

export function ManageModelsHeader({
  onClose,
  onConnect,
}: Readonly<{ onClose: () => void; onConnect: () => void }>) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border/60 bg-muted/20 px-5 py-4">
      <div className="gap-0.5">
        <h2 className="flex items-center gap-2 text-base font-bold text-foreground">
          <Icon name="gear" size="text-base" className="text-primary" /> Gestionar modelos
        </h2>
        <p className="text-[11px] text-muted-foreground">
          Activa los modelos que quieres usar en Asignación.
        </p>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-2">
        <Button size="sm" variant="outline" onClick={onConnect} className="gap-1.5 text-xs font-bold">
          + Conectar proveedor
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose} className="text-xs text-muted-foreground">
          Cerrar
        </Button>
      </div>
    </div>
  );
}
