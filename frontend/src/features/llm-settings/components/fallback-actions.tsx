import { ChainIconButton } from "./chain-icon-button";

interface FallbackActionsProps {
  disabled: boolean;
  index: number;
  total: number;
  onMove: (dir: number) => void;
  onRemove: () => void;
}

export function FallbackActions({
  disabled,
  index,
  total,
  onMove,
  onRemove,
}: Readonly<FallbackActionsProps>) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-1">
      <ChainIconButton
        label="Subir"
        disabled={disabled || index === 0}
        icon="caret-up"
        onClick={() => {
          onMove(-1);
        }}
      />
      <ChainIconButton
        label="Bajar"
        disabled={disabled || index === total - 1}
        icon="caret-down"
        onClick={() => {
          onMove(1);
        }}
      />
      <ChainIconButton label="Quitar" disabled={disabled} danger icon="trash" onClick={onRemove} />
    </div>
  );
}
