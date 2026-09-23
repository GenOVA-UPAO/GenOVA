import { Button } from "@/core/components/ui/button";

/** «Guardar cambios» de una sección: solo aparece cuando hay algo que guardar. */
export function SaveCardButton({
  disabled,
  saving,
  onClick,
}: Readonly<{ disabled: boolean; saving: boolean; onClick: () => void }>) {
  if (disabled && !saving) return null;
  return (
    <Button className="shrink-0 max-sm:h-11" loading={saving} onClick={onClick}>
      Guardar cambios
    </Button>
  );
}
