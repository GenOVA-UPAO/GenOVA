import { Checkbox } from "@/core/components/ui/checkbox";

interface MisOvasSelectAllProps {
  allSelected: boolean;
  onSelectAllChange: (checked: boolean) => void;
}

/** Checkbox para seleccionar todos los OVAs visibles en la página actual. */
export function MisOvasSelectAll({
  allSelected,
  onSelectAllChange,
}: Readonly<MisOvasSelectAllProps>) {
  return (
    <div className="flex w-fit items-center gap-2 px-2">
      <Checkbox
        id="mis-ovas-select-all"
        checked={allSelected}
        onCheckedChange={(checked) => {
          onSelectAllChange(Boolean(checked));
        }}
      />
      <label
        htmlFor="mis-ovas-select-all"
        className="cursor-pointer select-none text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        Seleccionar todos en esta página
      </label>
    </div>
  );
}
