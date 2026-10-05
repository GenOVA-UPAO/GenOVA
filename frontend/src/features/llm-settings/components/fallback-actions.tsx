import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("llm-settings");
  const row = `${t("tasks.fallbackSuffix")} ${String(index + 1)}`;
  return (
    <div className="flex shrink-0 items-center justify-end gap-1">
      <ChainIconButton
        label={t("tasks.moveUp")}
        ariaLabel={t("tasks.moveUpAria", { row })}
        disabled={disabled || index === 0}
        icon="caret-up"
        onClick={() => {
          onMove(-1);
        }}
      />
      <ChainIconButton
        label={t("tasks.moveDown")}
        ariaLabel={t("tasks.moveDownAria", { row })}
        disabled={disabled || index === total - 1}
        icon="caret-down"
        onClick={() => {
          onMove(1);
        }}
      />
      <ChainIconButton
        label={t("tasks.remove")}
        ariaLabel={t("tasks.removeAria", { row })}
        disabled={disabled}
        danger
        icon="trash"
        onClick={onRemove}
      />
    </div>
  );
}

