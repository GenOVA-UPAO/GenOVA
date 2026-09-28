import { Input } from "@/core/components/ui/input";

import type { ConfigField } from "../../lib/resource-config";

interface Props {
  id: string;
  field: ConfigField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

/** Un ajuste numérico: label arriba, ayuda con el rango debajo y el error bajo la ayuda. */
export function ResourceConfigField({ id, field, value, error, onChange }: Readonly<Props>) {
  const describedBy = error ? `${id}-help ${id}-error` : `${id}-help`;
  return (
    <div className="space-y-1.5 py-3 first:pt-0 last:pb-0">
      <label htmlFor={id} className="block text-sm font-medium">
        {field.label}
      </label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={field.min}
        max={field.max}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className="w-32"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      <p id={`${id}-help`} className="text-xs leading-relaxed text-muted-foreground">
        {field.description ? `${field.description}. ` : ""}Entre {field.min} y {field.max}.
      </p>
      {error && (
        <p id={`${id}-error`} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
