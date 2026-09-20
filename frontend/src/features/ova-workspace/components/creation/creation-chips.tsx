import { educationLevel, type EducationLevelId } from "../../lib/education-levels";
import type { OvaTheme } from "../../lib/types";

interface Props {
  theme: OvaTheme;
  nivel: EducationLevelId;
  onOpenTheme: () => void;
}

/** Chips resumen de la tarjeta de creación: tema visual y nivel educativo. */
export function CreationChips({ theme, nivel, onOpenTheme }: Readonly<Props>) {
  const themeLabel = `Color: ${theme.color === "free" ? "Libre" : "UPAO"} · Diseño: ${theme.design === "free" ? "Libre" : "UPAO"}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="rounded-full border bg-muted/60 px-3 py-1 text-xs"
        onClick={onOpenTheme}
      >
        {themeLabel}
      </button>
      <span className="rounded-full border bg-muted/60 px-3 py-1 text-xs">
        Nivel: {educationLevel(nivel).label}
      </span>
    </div>
  );
}
