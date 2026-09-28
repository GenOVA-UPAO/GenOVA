import { type ReactNode, useId } from "react";

import { Button } from "@/core/components/ui/button";
import { Checkbox } from "@/core/components/ui/checkbox";
import { cn } from "@/core/lib/cn";

interface SelectionToolbarProps {
  allSelected: boolean;
  selectedCount: number;
  /** Texto de la derecha cuando no hay selección (p. ej. «99 OVAs»). */
  summary: ReactNode;
  /** Acciones masivas, visibles solo con selección. */
  actions: ReactNode;
  disabled?: boolean;
  /** `inset`: cabecera dentro de un contenedor con borde (papelera). */
  variant?: "standalone" | "inset";
  onSelectAllChange: (checked: boolean) => void;
  onClearSelection: () => void;
}

const SELECT_ALL_LABEL = "Seleccionar todos en esta página";

function selectedLabel(count: number): string {
  return count === 1 ? "1 seleccionado" : `${String(count)} seleccionados`;
}

function toolbarClass(variant: "standalone" | "inset", selecting: boolean): string {
  const base = "flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2";
  if (variant === "inset") {
    return cn(base, "border-b border-border", selecting && "sticky top-0 z-20 bg-primary/5");
  }
  return cn(
    base,
    "rounded-xl border",
    selecting ? "sticky top-0 z-20 border-primary/40 bg-card shadow-xs" : "border-transparent",
  );
}

/**
 * Cabecera de lista con selección múltiple. Sin selección muestra «Seleccionar
 * todos en esta página» y el total; con selección pasa a ser la barra de
 * acciones masivas (y se queda fija arriba al hacer scroll).
 */
export function SelectionToolbar({
  allSelected,
  selectedCount,
  summary,
  actions,
  disabled = false,
  variant = "standalone",
  onSelectAllChange,
  onClearSelection,
}: Readonly<SelectionToolbarProps>) {
  const checkboxId = useId();
  const selecting = selectedCount > 0;

  return (
    <div
      role="toolbar"
      aria-label="Selección de OVAs"
      className={toolbarClass(variant, selecting)}
    >
      <Checkbox
        id={checkboxId}
        checked={allSelected}
        disabled={disabled}
        aria-label={selecting ? SELECT_ALL_LABEL : undefined}
        onCheckedChange={(checked) => {
          onSelectAllChange(checked === true);
        }}
      />
      {selecting ? (
        <span className="text-sm font-medium text-foreground tabular-nums" aria-live="polite">
          {selectedLabel(selectedCount)}
        </span>
      ) : (
        <label
          htmlFor={checkboxId}
          className="cursor-pointer text-sm text-muted-foreground select-none hover:text-foreground"
        >
          {SELECT_ALL_LABEL}
        </label>
      )}
      {selecting && (
        <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={disabled}>
          Quitar selección
        </Button>
      )}
      {selecting ? (
        <div className="flex gap-2 max-sm:w-full max-sm:*:flex-1 sm:ml-auto">{actions}</div>
      ) : (
        <span className="ml-auto text-sm text-muted-foreground tabular-nums">{summary}</span>
      )}
    </div>
  );
}
