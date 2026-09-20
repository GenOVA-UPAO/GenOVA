import type { Palette } from "./theme-types";

interface ThemeMiniPreviewProps {
  colorMode: string;
  designMode: string;
  palette: Palette | null;
}

const TABS = ["Engage", "Explore", "Explain", "Evaluate"];

function resolveColors(colorMode: string, palette: Palette | null) {
  if (colorMode === "upao") {
    return { primary: "#0A3D91", accent: "#F47A20" };
  }
  if (colorMode === "custom") {
    return {
      primary: palette?.p ?? "#0A3D91",
      accent: palette?.a ?? "#38BDF8",
    };
  }
  return { primary: "#6D28D9", accent: "#A78BFA" };
}

/** Previsualización reducida de la apariencia del OVA con el tema seleccionado. */
export function ThemeMiniPreview({
  colorMode,
  designMode,
  palette,
}: Readonly<ThemeMiniPreviewProps>) {
  const { primary, accent } = resolveColors(colorMode, palette);
  const isTabbed = designMode !== "ai";

  return (
    <div className="overflow-hidden rounded-xl border border-border shadow-md">
      <div style={{ background: primary }} className="px-3 py-2.5">
        <div className="text-[9px] font-bold text-white">Fotosíntesis y el Ciclo</div>
        <div className="mt-0.5 text-[7px] text-white/60">Biología — 2° año · UPAO 2026</div>
      </div>
      {isTabbed && (
        <div className="flex border-b border-border bg-muted/30">
          {TABS.map((tab, i) => (
            <div
              key={tab}
              className="shrink-0 px-2 py-1.5 text-[7px] font-semibold"
              style={{
                color: i === 0 ? accent : "#94a3b8",
                borderBottom: i === 0 ? `2px solid ${accent}` : "2px solid transparent",
              }}
            >
              {tab}
            </div>
          ))}
        </div>
      )}
      <div className="space-y-2 bg-background p-2.5">
        <div className="h-2 w-3/5 rounded-full opacity-25" style={{ background: primary }} />
        <div className="h-1.5 w-full rounded-full bg-muted" />
        <div className="h-1.5 w-5/6 rounded-full bg-muted" />
        <div className="h-1.5 w-4/6 rounded-full bg-muted" />
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <div className="h-8 rounded-lg opacity-20" style={{ background: accent }} />
          <div className="h-8 rounded-lg bg-muted/50" />
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="h-2 flex-1 rounded-full opacity-40"
            style={{ background: accent }}
          />
          <div className="h-2 w-8 rounded-full bg-muted" />
        </div>
      </div>
      <div style={{ background: primary, opacity: 0.06 }} className="h-1" />
    </div>
  );
}
