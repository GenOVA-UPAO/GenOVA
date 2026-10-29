import { useTranslation } from "react-i18next";

import { Input } from "@/core/components/ui/input";

interface TimeoutFieldProps {
  id: string;
  /** Tarea a la que se aplica, para el nombre accesible («Espera máxima de Texto…»). */
  taskLabel: string;
  value: number | undefined;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (seconds: number) => void;
}

/** Tiempo máximo de espera de una tarea, en segundos, con su etiqueta visible encima. */
export function TimeoutField({
  id,
  taskLabel,
  value,
  min,
  max,
  disabled,
  onChange,
}: Readonly<TimeoutFieldProps>) {
  const { t } = useTranslation("llm-settings");

  return (
    <div className="flex shrink-0 flex-col gap-1">
      <label htmlFor={id} className="text-xs text-muted-foreground">
        {t("tasks.maxWait")}
      </label>
      <div className="flex items-center gap-1.5">
        <Input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value ?? ""}
          disabled={disabled}
          aria-label={t("tasks.maxWaitRangeOf", { task: taskLabel, min, max })}
          onChange={(event) => {
            const seconds = Number(event.target.value);
            if (!Number.isNaN(seconds)) onChange(seconds);
          }}
          className="h-9 w-[4.5rem] px-1.5 text-center tabular-nums max-sm:h-11"
        />
        <span className="text-xs text-muted-foreground" aria-hidden="true">
          s
        </span>
      </div>
    </div>
  );
}
