import type { ReactNode } from "react";

import { Label } from "@/core/components/ui/label";

interface AuthFieldProps {
  id: string;
  label: string;
  children: ReactNode;
  error?: string;
  /** Ayuda persistente bajo el campo; el error la sustituye mientras exista. */
  hint?: string;
}

/**
 * Label arriba, campo y, debajo, el error o la ayuda. Los ids (`<id>-error`,
 * `<id>-hint`) son los que `bind(name, { id, hint })` pone en aria-describedby.
 */
export function AuthField({ id, label, children, error, hint }: Readonly<AuthFieldProps>) {
  return (
    <div className="flex flex-col space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
      {!error && hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
