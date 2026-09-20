import { ThemeMiniPreview } from "./theme-mini-preview";
import type { ThemeState } from "./theme-types";

interface ThemeModalPreviewProps {
  theme: ThemeState;
}

/** Previsualización miniatura del tema y plantilla seleccionados en el modal. */
export function ThemeModalPreview({ theme }: Readonly<ThemeModalPreviewProps>) {
  return (
    <div className="w-full shrink-0 space-y-2 sm:w-44">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Previsualización
      </p>
      <ThemeMiniPreview
        colorMode={theme.colorMode}
        designMode={theme.designMode}
        palette={theme.palette}
      />
      <p className="text-center text-[10px] leading-snug text-muted-foreground">
        Estructura y colores aproximados
      </p>
    </div>
  );
}
