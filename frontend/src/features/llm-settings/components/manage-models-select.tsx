import type { ReactNode } from "react";

import { cn } from "@/core/lib/cn";

const SELECT_CLASS =
  "cursor-pointer rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:outline-none";

interface ManageModelsSelectProps {
  value: string;
  label: string;
  className?: string;
  children: ReactNode;
  onChange: (value: string) => void;
}

export function ManageModelsSelect({
  value,
  label,
  className,
  children,
  onChange,
}: Readonly<ManageModelsSelectProps>) {
  return (
    <select
      value={value}
      aria-label={label}
      title={label}
      className={cn(SELECT_CLASS, className)}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    >
      {children}
    </select>
  );
}
