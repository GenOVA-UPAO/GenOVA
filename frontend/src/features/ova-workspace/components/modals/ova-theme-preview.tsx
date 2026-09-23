import { Icon } from "@/core/components/icon";

import type { OvaTheme } from "../../lib/types";

const UPAO_DOTS = ["#F47A20", "#FFFFFF", "#F47A20"] as const;

/** Miniatura aproximada de cómo se verá el tema en un recurso. */
export function OvaThemePreview({ draft }: Readonly<{ draft: OvaTheme }>) {
  const primary = draft.color === "upao" ? "#0A3D91" : "#6D28D9";
  const accent = draft.color === "upao" ? "#F47A20" : "#A78BFA";
  const freeDesign = draft.design === "free";
  return (
    <div className="w-full max-w-xs space-y-2 sm:w-64 sm:shrink-0">
      <p className="text-sm font-medium text-foreground">Vista previa</p>
      <figure className="overflow-hidden rounded-xl border border-border bg-background text-left">
        <div
          className="flex items-center justify-between gap-2 px-3.5 py-3 transition-colors duration-300"
          style={{ background: primary }}
        >
          <p className="text-[10px] font-bold text-white">Introducción al tema</p>
          <span className="flex items-center gap-1" aria-hidden="true">
            {UPAO_DOTS.map((color, index) => (
              <span
                key={index}
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: color, opacity: index === 1 ? 0.55 : 1 }}
              />
            ))}
          </span>
        </div>
        <div
          className="relative h-14 overflow-hidden transition-colors duration-300"
          style={{ background: `linear-gradient(135deg, ${primary}1A 0%, ${accent}26 100%)` }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full transition-colors duration-300"
              style={{ background: `${accent}33`, border: `1.5px solid ${accent}66` }}
            >
              <span
                aria-hidden="true"
                className="ml-0.5 block h-0 w-0 border-y-[3px] border-l-[5px] border-y-transparent"
                style={{ borderLeftColor: accent }}
              />
            </div>
          </div>
        </div>
        <div className="space-y-2 bg-background p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-bold leading-none" style={{ color: primary }}>
              ¿Qué dice la ley de Ohm?
            </p>
            <span
              className="flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[7px] font-bold"
              style={{ background: `${accent}26`, color: primary }}
            >
              <Icon name={freeDesign ? "sparkle" : "square-half"} size="text-[9px]" className="shrink-0" />
              {freeDesign ? "Estructura libre" : "5E"}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted/70" />
          <div className="h-1.5 w-5/6 rounded-full bg-muted/70" />
          <div className="h-1.5 w-4/6 rounded-full bg-muted/70" />
          <div
            className="mt-1.5 rounded-md py-1.5 text-center transition-colors duration-300"
            style={{ background: accent }}
          >
            <p className="text-[8px] font-bold text-white">Continuar →</p>
          </div>
        </div>
        <figcaption className="border-t border-border px-3.5 py-2 text-center">
          <p className="text-[11px] leading-snug text-muted-foreground">Colores y estructura aproximados</p>
        </figcaption>
      </figure>
    </div>
  );
}
