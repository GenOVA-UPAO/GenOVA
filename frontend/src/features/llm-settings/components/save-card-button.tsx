import { Button } from "@/core/components/ui/button";

export function SaveCardButton({
  disabled,
  saving,
  onClick,
}: Readonly<{ disabled: boolean; saving: boolean; onClick: () => void }>) {
  return (
    <Button className="shrink-0 font-bold shadow-md" disabled={disabled || saving} onClick={onClick}>
      {saving ? "Guardando..." : "Guardar cambios"}
    </Button>
  );
}
