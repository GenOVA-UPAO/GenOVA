import type { ReactNode } from "react";

import { Label } from "@/core/components/ui/label";

interface AuthFieldProps {
  id: string;
  label: string;
  children: ReactNode;
  error?: string;
}

export function AuthField({ id, label, children, error }: Readonly<AuthFieldProps>) {
  return (
    <div className="flex flex-col space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
