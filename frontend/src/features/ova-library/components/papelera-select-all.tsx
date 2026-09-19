import { Checkbox } from "@/core/components/ui/checkbox";

interface PapeleraSelectAllProps {
  allSelected: boolean;
  onSelectAllChange: (checked: boolean) => void;
}

/** Checkbox para seleccionar todos los OVAs visibles en la papelera. */
export function PapeleraSelectAll({
  allSelected,
  onSelectAllChange,
}: Readonly<PapeleraSelectAllProps>) {
  return (
    <div className="flex w-fit items-center gap-2 px-2">
      <Checkbox
        id="papelera-select-all"
        checked={allSelected}
        onCheckedChange={(checked) => {
          onSelectAllChange(Boolean(checked));
        }}
      />
      <label
        htmlFor="papelera-select-all"
        className="cursor-pointer select-none text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Seleccionar todos en esta página
      </label>
    </div>
  );
}
