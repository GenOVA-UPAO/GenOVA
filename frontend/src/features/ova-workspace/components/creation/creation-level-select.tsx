import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select";

import { EDUCATION_LEVELS, type EducationLevelId } from "../../lib/education-levels";

interface Props {
  value: EducationLevelId;
  onChange: (nivel: EducationLevelId) => void;
}

/** Nivel educativo del OVA; en móvil, con la etiqueta encima y a lo ancho. */
export function CreationLevelSelect({ value, onChange }: Readonly<Props>) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5 pt-1 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:gap-2 sm:pt-0">
      <label
        htmlFor="ova-create-nivel"
        className="shrink-0 text-sm font-medium text-muted-foreground sm:text-xs"
      >
        Nivel educativo
      </label>
      <Select
        value={value}
        onValueChange={(next) => {
          onChange(next as EducationLevelId);
        }}
      >
        <SelectTrigger
          id="ova-create-nivel"
          className="w-full min-w-0 max-sm:data-[size=default]:h-11 sm:w-auto"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {EDUCATION_LEVELS.map((level) => (
            <SelectItem key={level.id} value={level.id}>
              {level.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
