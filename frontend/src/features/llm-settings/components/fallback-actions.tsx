import { ChainIconButton } from "./chain-icon-button";

interface FallbackActionsProps {
  disabled: boolean;
  index: number;
  total: number;
  onMove: (dir: number) => void;
  onRemove: () => void;
}

/** Subir, bajar y quitar un respaldo. Cada nombre accesible dice de qué fila es. */
export function FallbackActions({
  disabled,
  index,
  total,
  onMove,
  onRemove,
}: Readonly<FallbackActionsProps>) {
  const row = `respaldo ${String(index + 1)}`;
  return (
    <div className="flex shrink-0 items-center justify-end gap-1">
      <ChainIconButton
        label="Subir"
        ariaLabel={`Subir ${row}`}
        disabled={disabled || index === 0}
        icon="caret-up"
        onClick={() => {
          onMove(-1);
        }}
      />
      <ChainIconButton
        label="Bajar"
        ariaLabel={`Bajar ${row}`}
        disabled={disabled || index === total - 1}
        icon="caret-down"
        onClick={() => {
          onMove(1);
        }}
      />
      <ChainIconButton
        label="Quitar"
        ariaLabel={`Quitar ${row}`}
        disabled={disabled}
        danger
        icon="trash"
        onClick={onRemove}
      />
    </div>
  );
}
