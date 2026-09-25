import type { Ref } from "react";

import { Button } from "@/core/components/ui/button";

interface UserKeyRowActionsProps {
  /** Botón «Añadir/Cambiar clave»: recibe el foco al cancelar, guardar o quitar. */
  startRef?: Ref<HTMLButtonElement>;
  editing: boolean;
  configured: boolean;
  saving: boolean;
  /** «Probar conexión» (solo con clave guardada y fuera de edición). */
  checking?: boolean;
  /** Nombre del proveedor, para distinguir los «Probar conexión» de cada fila. */
  label?: string;
  onCheck?: () => void;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function UserKeyRowActions({
  startRef,
  editing,
  configured,
  saving,
  checking = false,
  label = "",
  onCheck,
  onStart,
  onCancel,
  onSave,
}: Readonly<UserKeyRowActionsProps>) {
  const startLabel = configured ? "Cambiar clave" : "Añadir clave";
  if (editing) {
    return (
      <div className="flex gap-2">
        <Button variant="outline" className="max-sm:h-11 max-sm:flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button className="max-sm:h-11 max-sm:flex-1" loading={saving} onClick={onSave}>
          Guardar clave
        </Button>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 flex-wrap gap-2">
      {configured && onCheck ? (
        <Button
          variant="ghost"
          className="max-sm:h-11"
          loading={checking}
          aria-label={label ? `Probar conexión con ${label}` : undefined}
          onClick={onCheck}
        >
          Probar conexión
        </Button>
      ) : null}
      <Button
        ref={startRef}
        variant="outline"
        className="shrink-0 max-sm:h-11"
        data-key-edit=""
        aria-label={label ? `${startLabel} de ${label}` : undefined}
        onClick={onStart}
      >
        {startLabel}
      </Button>
    </div>
  );
}
