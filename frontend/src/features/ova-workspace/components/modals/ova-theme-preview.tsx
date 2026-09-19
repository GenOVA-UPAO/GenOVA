import type { OvaTheme } from "../../lib/types";

/** Miniatura aproximada de cómo se verá el tema en un recurso. */
export function OvaThemePreview({ draft }: Readonly<{ draft: OvaTheme }>) {
  const primary = draft.color === "upao" ? "#0A3D91" : "#6D28D9";
  const accent = draft.color === "upao" ? "#F47A20" : "#A78BFA";
  return (
    <div className="w-40 shrink-0 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Vista previa</p>
      <div className="overflow-hidden rounded-xl border border-border text-left shadow-md">
        <div className="px-3 py-2.5" style={{ background: primary }}>
          <p className="text-[9px] font-bold text-white">Introducción al tema</p>
        </div>
        <div className="relative h-10 overflow-hidden" style={{ background: `linear-gradient(135deg, ${primary}1A 0%, ${accent}26 100%)` }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-5 w-5 items-center justify-center rounded-full" style={{ background: `${accent}33`, border: `1.5px solid ${accent}66` }} />
          </div>
        </div>
        <div className="space-y-1.5 bg-background p-2.5">
          <p className="text-[7px] font-bold leading-none" style={{ color: primary }}>
            ¿Qué es una red neuronal?
          </p>
          <div className="h-1 w-full rounded-full bg-muted/70" />
          <div className="h-1 w-5/6 rounded-full bg-muted/70" />
          <div className="h-1 w-4/6 rounded-full bg-muted/70" />
          <div className="mt-1 rounded-md py-1 text-center" style={{ background: accent }}>
            <p className="text-[6px] font-bold text-white">Continuar →</p>
          </div>
        </div>
      </div>
      <p className="text-center text-[10px] leading-snug text-muted-foreground/70">Colores y estructura aproximados</p>
    </div>
  );
}
