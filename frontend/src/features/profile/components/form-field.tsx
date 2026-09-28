import type { ReactNode } from "react";

import { Label } from "@/core/components/ui/label";

interface FormFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}

/** Campo con label arriba, ayuda y error debajo (ids enlazables con aria-describedby). */
export function FormField({ id, label, hint, error, children }: Readonly<FormFieldProps>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error !== undefined && (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      )}
      {error === undefined && hint !== undefined && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
